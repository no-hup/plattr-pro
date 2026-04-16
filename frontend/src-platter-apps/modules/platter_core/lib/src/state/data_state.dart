/// Represents the state of data loading operations.
enum DataState {
  /// Initial state before any operation
  initial,

  /// Data is currently being loaded
  loading,

  /// Data has been successfully loaded
  loaded,

  /// An error occurred during loading
  error,
}
