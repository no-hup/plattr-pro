/**
 * Mocks for Firestore Database and Transactions
 */

/**
 * Creates a mock document snapshot
 */
function mockDocSnapshot(ref, data) {
    return {
        exists: !!data,
        id: ref.id,
        ref: ref,
        data: () => data,
        get: (field) => data && data[field]
    };
}

/**
 * Creates a mock transaction object
 * @param {Object} mockData - Map of path -> document data
 */
function createMockTransaction(mockData) {
    return {
        get: jest.fn((ref) => {
            // If ref is a string (legacy/direct usage), handle it? 
            // Firestore transaction.get expects a DocumentReference.
            const path = ref.path;
            return Promise.resolve(mockDocSnapshot(ref, mockData[path]));
        }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    };
}

/**
 * Creates a mock Firestore database
 * @param {Object} initialData - Map of path -> document data
 */
function mockFirestoreDb(initialData = {}) {
    // Helper to get doc ref
    const getDocRef = (path) => {
        const parts = path.split('/');
        const docId = parts[parts.length - 1];
        return {
            id: docId,
            path: path,
            get: jest.fn(() => Promise.resolve(mockDocSnapshot({ id: docId, path }, initialData[path]))),
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            collection: (subName) => getCollectionRef(`${path}/${subName}`)
        };
    };

    // Helper to get collection ref
    const getCollectionRef = (path) => {
        return {
            doc: (docId) => getDocRef(docId ? `${path}/${docId}` : `${path}/generatedId_${Math.random()}`),
            add: jest.fn(),
            where: jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ docs: [], empty: true })) })) // Basic query mock
        };
    };

    return {
        collection: (name) => getCollectionRef(name),
        doc: (path) => getDocRef(path),
        runTransaction: jest.fn(async (updateFn) => {
            const transaction = createMockTransaction(initialData);
            return await updateFn(transaction);
        })
    };
}

module.exports = { mockFirestoreDb, createMockTransaction, mockDocSnapshot };
