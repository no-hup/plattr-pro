const variantFixtures = {
    small: {
        id: 'v1_small',
        variantId: 'v1', // References the variant group ID on the item
        name: 'Small',
        priceInfo: { basePrice: 0, discount: 0, finalPrice: 0 },
        respectParentDiscount: true
    },
    large: {
        id: 'v1_large',
        variantId: 'v1',
        name: 'Large',
        priceInfo: { basePrice: 50, discount: 0, finalPrice: 50 },
        respectParentDiscount: true
    },
    premium: {
        id: 'v1_premium',
        variantId: 'v1',
        name: 'Premium',
        priceInfo: { basePrice: 100, discount: 0, finalPrice: 100 },
        respectParentDiscount: false // Own pricing
    }
};

module.exports = variantFixtures;
