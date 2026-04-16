const menuItemFixtures = {
    simple: {
        id: 'item001',
        name: 'Simple Item',
        priceInfo: { basePrice: 100, discount: 0, finalPrice: 100 },
        isInStock: true,
        variants: [],
        addons: []
    },
    discounted: {
        id: 'item002',
        name: 'Discounted Item',
        priceInfo: { basePrice: 100, discount: 20, finalPrice: 80 },
        isInStock: true,
        variants: [],
        addons: []
    },
    withVariants: {
        id: 'item003',
        name: 'Item With Variants',
        priceInfo: { basePrice: 50, discount: 0, finalPrice: 50 },
        variants: [{ id: 'v1', name: 'Size' }],
        isInStock: true,
        addons: []
    },
    withAddons: {
        id: 'item004',
        name: 'Item With Addons',
        priceInfo: { basePrice: 100, discount: 0, finalPrice: 100 },
        addons: [{ id: 'addon1', name: 'Extras' }],
        isInStock: true,
        variants: []
    },
    outOfStock: {
        id: 'item005',
        name: 'Out of Stock Item',
        priceInfo: { basePrice: 100, discount: 0, finalPrice: 100 },
        isInStock: false,
        variants: [],
        addons: []
    },
    invalidPrice: {
        id: 'item006',
        name: 'Invalid Price Item',
        priceInfo: { basePrice: NaN },
        isInStock: true
    }
};

module.exports = menuItemFixtures;
