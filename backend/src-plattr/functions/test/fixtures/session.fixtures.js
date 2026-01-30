const sessionFixtures = {
    active: {
        id: 'session001',
        restaurantId: 'rest001',
        tableId: 'table001',
        status: 'active',
        expiresAt: Date.now() + 3600000 // 1 hour future
    },
    expired: {
        id: 'session002',
        restaurantId: 'rest001',
        tableId: 'table001',
        status: 'active',
        expiresAt: Date.now() - 3600000 // 1 hour past
    },
    inactive: {
        id: 'session003',
        restaurantId: 'rest001',
        tableId: 'table001',
        status: 'closed',
        expiresAt: Date.now() + 3600000
    }
};

module.exports = sessionFixtures;
