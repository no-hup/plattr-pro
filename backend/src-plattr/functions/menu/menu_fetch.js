const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const MenuValidation = require('./menuValidation');

exports.fetchMenu = functions.https.onCall(async (data, context) => {
  // Validate input parameters
  const validatedData = MenuValidation.validateMenuFetchInput(data);
  const { restaurantId, inStock } = validatedData;
  console.log("poopoo " + restaurantId +"  "+  inStock);

  try {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Restaurant not found');
    }

    const [categories, menuItems, variants, addons] = await Promise.all([
      fetchCategories(restaurantRef),
      fetchMenuItems(restaurantRef, inStock),
      fetchVariants(restaurantRef),
      fetchInStockAddons(restaurantRef, inStock)
    ]);

    const organizedMenu = organizeMenu(categories, menuItems, variants, addons);
    organizedMenu.metadata = {
      totalCategories: categories.length,
      totalMenuItems: menuItems.length
    };

    return organizedMenu;

  } catch (error) {
    console.error('Error fetching menu:', error);
    throw new functions.https.HttpsError('internal', 'Unable to fetch menu');
  }
});

async function fetchCategories(restaurantRef) {
  const categoriesSnapshot = await restaurantRef.collection('categories').orderBy('order').get();
  return categoriesSnapshot.docs.map(doc => {
    const data = doc.data();
    if (!data.name) throw new Error('Category name is missing');
    return { id: doc.id, ...data };
  });
}

async function fetchMenuItems(restaurantRef, inStock) {
  let query = restaurantRef.collection('menuItems');
  if (inStock !== false) {
    query = query.where('isInStock', '==', true);
  }
  const menuItemsSnapshot = await query.get();
  return menuItemsSnapshot.docs.map(doc => ({
    menuItemId: doc.id,
    ...doc.data()
  }));
}

async function fetchVariants(restaurantRef) {
  const variantsSnapshot = await restaurantRef.collection('variants').get();
  return variantsSnapshot.docs.reduce((acc, doc) => {
    acc[doc.id] = { id: doc.id, ...doc.data() };
    return acc;
  }, {});
}

async function fetchInStockAddons(restaurantRef, inStock) {
  let query = restaurantRef.collection('addons');
  if (inStock !== false) {
    query = query.where('isInStock', '==', true);
  }
  const addonsSnapshot = await query.get();
  return addonsSnapshot.docs.reduce((acc, doc) => {
    acc[doc.id] = { id: doc.id, ...doc.data() };
    return acc;
  }, {});
}

function organizeMenu(categories, menuItems, variants, addons) {
  const organizedMenu = {
    categories,
    menuItems: {}
  };

  menuItems.forEach(item => {
    if (!organizedMenu.menuItems[item.categoryId]) {
      organizedMenu.menuItems[item.categoryId] = [];
    }

    const itemVariants = (item.variants || []).map(variant =>
      variants[variant.id] ? { ...variants[variant.id], name: variant.name } : null
    ).filter(Boolean);

    const itemAddons = (item.addons || []).map(addonId => addons[addonId]).filter(Boolean);

    organizedMenu.menuItems[item.categoryId].push({
      ...item,
      variants: itemVariants,
      addons: itemAddons
    });
  });

  return organizedMenu;
}
