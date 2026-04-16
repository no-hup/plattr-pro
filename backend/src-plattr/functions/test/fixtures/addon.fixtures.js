const addonFixtures = {
    cheese: {
        id: 'addon_cheese',
        name: 'Extra Cheese',
        priceInfo: { basePrice: 20, discount: 0, finalPrice: 20 },
        respectParentDiscount: true
    },
    bacon: {
        id: 'addon_bacon',
        name: 'Bacon',
        priceInfo: { basePrice: 50, discount: 0, finalPrice: 50 },
        respectParentDiscount: false
    }
};

module.exports = addonFixtures;
