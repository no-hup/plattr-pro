/// A Result type for handling success/error states in a type-safe way.
///
/// This is a sealed class pattern that forces handling of both success and error cases.
///
/// Usage:
/// ```dart
/// final result = await fetchData();
/// switch (result) {
///   case Success(:final data):
///     print('Got data: $data');
///   case Failure(:final error, :final message):
///     print('Error: $message');
/// }
/// ```
///
/// Or using helper methods:
/// ```dart
/// final result = await fetchData();
/// if (result.isSuccess) {
///   print('Got: ${result.data}');
/// } else {
///   print('Error: ${result.message}');
/// }
/// ```
sealed class Result<T> {
  const Result();

  /// Creates a successful result with data
  factory Result.success(T data) => Success(data);

  /// Creates a failed result with error details
  factory Result.failure(String message, {String? errorCode, dynamic error}) =>
      Failure(message, errorCode: errorCode, error: error);

  /// Whether this result is a success
  bool get isSuccess => this is Success<T>;

  /// Whether this result is a failure
  bool get isFailure => this is Failure<T>;

  /// Get data if success, null otherwise
  T? get data => switch (this) {
        Success(:final data) => data,
        Failure() => null,
      };

  /// Get error message if failure, null otherwise
  String? get message => switch (this) {
        Success() => null,
        Failure(:final message) => message,
      };

  /// Get error code if failure, null otherwise
  String? get errorCode => switch (this) {
        Success() => null,
        Failure(:final errorCode) => errorCode,
      };

  /// Map the success value to a new type
  Result<R> map<R>(R Function(T data) mapper) => switch (this) {
        Success(:final data) => Success(mapper(data)),
        Failure(:final message, :final errorCode, :final error) =>
          Failure(message, errorCode: errorCode, error: error),
      };

  /// Map the success value to a new Result
  Result<R> flatMap<R>(Result<R> Function(T data) mapper) => switch (this) {
        Success(:final data) => mapper(data),
        Failure(:final message, :final errorCode, :final error) =>
          Failure(message, errorCode: errorCode, error: error),
      };

  /// Apply a function if success, return self if failure
  Result<T> onSuccess(void Function(T data) action) {
    if (this case Success(:final data)) {
      action(data);
    }
    return this;
  }

  /// Apply a function if failure, return self if success
  Result<T> onFailure(void Function(String message, String? errorCode) action) {
    if (this case Failure(:final message, :final errorCode)) {
      action(message, errorCode);
    }
    return this;
  }

  /// Get data or throw exception if failure
  T getOrThrow() => switch (this) {
        Success(:final data) => data,
        Failure(:final message) => throw Exception(message),
      };

  /// Get data or return default value if failure
  T getOrElse(T defaultValue) => switch (this) {
        Success(:final data) => data,
        Failure() => defaultValue,
      };

  /// Get data or compute default value if failure
  T getOrElseCompute(T Function() compute) => switch (this) {
        Success(:final data) => data,
        Failure() => compute(),
      };
}

/// Represents a successful result with data
final class Success<T> extends Result<T> {
  const Success(this._data);

  final T _data;

  @override
  T get data => _data;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Success<T> && runtimeType == other.runtimeType && _data == other._data;

  @override
  int get hashCode => _data.hashCode;

  @override
  String toString() => 'Success($_data)';
}

/// Represents a failed result with error information
final class Failure<T> extends Result<T> {
  const Failure(this._message, {this.errorCode, this.error});

  final String _message;
  @override
  final String? errorCode;
  final dynamic error;

  @override
  String get message => _message;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Failure<T> &&
          runtimeType == other.runtimeType &&
          _message == other._message &&
          errorCode == other.errorCode;

  @override
  int get hashCode => Object.hash(_message, errorCode);

  @override
  String toString() =>
      'Failure($_message${errorCode != null ? ', code: $errorCode' : ''})';
}

/// Extension to convert Future<T> to Future<Result<T>>
extension FutureResultExtension<T> on Future<T> {
  /// Wraps this future in a Result, catching any errors
  Future<Result<T>> toResult() async {
    try {
      return Result.success(await this);
    } catch (e) {
      return Result.failure(e.toString(), error: e);
    }
  }
}
