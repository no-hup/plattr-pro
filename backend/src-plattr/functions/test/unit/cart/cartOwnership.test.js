/**
 * Whose item is it? — ownership on a shared table cart.
 *
 * A table has ONE cart doc (restaurants/{id}/carts/{tableId}) shared by everyone
 * in the session. Until now nothing recorded who added a line, so two people who
 * both ordered a Margherita became one line of qty 2, and either of them could
 * delete it. `addedBy` is that missing field.
 *
 * `addedBy` is a device id minted by the guest app, not an account: it says
 * "this phone", which is as much as a QR guest ever tells us. Legacy carts and
 * older clients send nothing, so `addedBy: null` means "unowned" and keeps the
 * old shared-list behaviour exactly.
 */
jest.mock('../../../admin/admin', () => {
  const { mockFirestoreDb } = require('../../mocks/firestore.mock');
  return {
    db: mockFirestoreDb(),
    admin: { firestore: () => mockFirestoreDb() },
    FieldValue: { serverTimestamp: jest.fn(), delete: jest.fn(), increment: jest.fn() },
    Timestamp: { now: jest.fn(), fromDate: jest.fn() },
  };
});

const {
  createCartItem,
  findIdenticalItemInCart,
} = require('../../../cart/addItemToCartBoilerplateHelper');
const { compareArraysIgnoringOrder } = require('../../../utils/arrayUtils');

const MENU_ITEM = {
  name: 'Margherita',
  categoryId: 'cat_pizza',
  subcategoryIds: [],
  priceInfo: { basePrice: 30000, finalPrice: 30000, discount: 0, discountAmount: 0 },
};

const item = (addedBy) =>
  createCartItem('mi_margherita', MENU_ITEM, [], [], 1, null, 1, addedBy);

const find = (cartItems, newItem) =>
  findIdenticalItemInCart(cartItems, newItem, compareArraysIgnoringOrder);

describe('cart item ownership', () => {
  // CHARACTERIZATION — this is today's behaviour and it must not change for
  // carts written before `addedBy` existed, or by a client that never sends it.
  it('merges two identical unowned items, as it always has', () => {
    expect(find([item(undefined)], item(undefined))).toBe(0);
  });

  it('records addedBy on the item when the caller supplies one', () => {
    expect(item('dev_asha').addedBy).toBe('dev_asha');
  });

  it('leaves addedBy null when the caller supplies none', () => {
    expect(item(undefined).addedBy).toBeNull();
  });

  // THE BUG. Asha and Bhanu both add a Margherita. Today they become one line of
  // qty 2, so when Asha removes hers Bhanu's disappears too and the kitchen is
  // one pizza short of what the table thinks it ordered.
  it('does not merge the same dish added by two different people', () => {
    expect(find([item('dev_asha')], item('dev_bhanu'))).toBe(-1);
  });

  it('still merges the same dish added twice by the same person', () => {
    expect(find([item('dev_asha')], item('dev_asha'))).toBe(0);
  });

  // An owned item and a legacy unowned one are not the same line either —
  // otherwise the first person to upgrade their app absorbs the table's
  // pre-existing list into their own group and sends it on their next tap.
  it('does not merge an owned item with an unowned one', () => {
    expect(find([item(undefined)], item('dev_asha'))).toBe(-1);
  });
});

describe('TD-048 a note is part of a line\'s identity', () => {
  test('the same dish with a different note is a different line; the same note merges', () => {
    const plain = createCartItem('mi_margherita', MENU_ITEM, [], [], 1, null, 1, 'asha');
    const noOnion = createCartItem('mi_margherita', MENU_ITEM, [], [], 1, null, 2, 'asha', 'no onion');
    expect(noOnion.note).toBe('no onion');
    expect(plain.note).toBe('');
    expect(find([plain], noOnion)).toBe(-1);
    expect(find([noOnion], createCartItem('mi_margherita', MENU_ITEM, [], [], 1, null, 3, 'asha', ' no onion '))).toBe(0);   // trimmed
  });
});
