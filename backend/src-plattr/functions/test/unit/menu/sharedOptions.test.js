// D6 (Shaurya 2026-09-25): add-ons and portions are shared records that dishes link to by id; every read builds
// the dish from the shared record. moonshot/reviews/2026-09-25-decisions-for-shaurya.md.
const { organizeMenuWithSubcategories } = require('../../../menu/menuHelpers');

const portion = {
  id: 'mv_bir_portion', name: 'Portion size', isMandatory: true, respectParentDiscount: true,
  options: [{ id: 'single', name: 'Single', priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 } },
    { id: 'family', name: 'Family (serves 3)', priceInfo: { basePrice: 280, finalPrice: 280, discount: 0 } }],
};
const raita = { id: 'ma_extra_raita', meta: { name: 'Extra Raita' }, priceInfo: { basePrice: 40, finalPrice: 40, discount: 0 }, isInStock: true };
// The dish still carries the name it was linked with; the manager has since renamed the shared record.
const chicken = {
  menuItemId: 'mi_chicken_bir', categoryId: 'mc_biryani', subcategoryIds: ['ms_bir_chicken'],
  variants: [{ id: 'mv_bir_portion', name: 'Portion' }], addons: ['ma_extra_raita', 'ma_gone'],
};
const read = () => organizeMenuWithSubcategories([{ id: 'mc_biryani', name: 'Biryani' }], [], [chicken],
  { mv_bir_portion: portion }, { ma_extra_raita: raita }).menuItems.ms_bir_chicken[0];

describe('menu read builds a dish from the shared add-on and portion records (D6)', () => {
  // Removed with the fix: test.failing → it.
  test.failing('[known bug] TD-107 D6 the portion group is named by the shared record, as the cart names it: "Portion size", not the dish copy', () => {
    expect(read().variants.map(v => v.name)).toEqual(['Portion size']);
  });

  it('D6 Family is +₹280 from the shared record', () => {
    expect(read().variants[0].options.find(o => o.id === 'family').priceInfo.basePrice).toBe(280);
  });

  it('D6 an add-on id with no shared record (switched off by the stock read, or never created) is not offered', () => {
    expect(read().addons.map(a => a.id)).toEqual(['ma_extra_raita']);
  });
});
