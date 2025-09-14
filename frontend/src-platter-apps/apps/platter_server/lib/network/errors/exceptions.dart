class ParsingException implements Exception {
  final String modelName;
  final String message;
  final dynamic rawJson;

  ParsingException({
    required this.modelName,
    required this.message,
    this.rawJson,
  });

  @override
  String toString() {
    return 'ParsingException: $modelName: $message, rawJson: $rawJson';
  }
}
