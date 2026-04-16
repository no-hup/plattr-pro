const { createMockTransaction } = require('./firestore.mock');

/**
 * Helper to build transaction mocks with specific scenarios
 */
class TransactionBuilder {
    constructor(initialData = {}) {
        this.data = { ...initialData };
        this.transaction = createMockTransaction(this.data);
    }

    withDocument(path, data) {
        this.data[path] = data;
        // Re-create transaction to capture new data reference if strictly needed,
        // though createMockTransaction uses reference to data object?
        // In current impl, it captures reference to data object if passed by reference? 
        // Actually current impl: mockData[ref.path] -> so modifying this.data should work if passed object is same.
        // But createMockTransaction takes 'mockData' value. 
        // Let's just create new transaction to be safe or ensure we pass reference.

        // Simpler: Just update the internal data storage the mock uses.
        return this;
    }

    build() {
        // Re-instantiate to ensure it sees latest data
        return createMockTransaction(this.data);
    }
}

module.exports = { TransactionBuilder };
