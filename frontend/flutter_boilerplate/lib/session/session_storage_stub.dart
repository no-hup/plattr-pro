/// Stub class for non-web platforms to avoid import errors
/// 
/// This is used as a fallback when importing dart:html on non-web platforms
class Window {
  final SessionStorage sessionStorage = SessionStorage();
}

/// Stub SessionStorage for non-web platforms
class SessionStorage {
  final Map<String, String> _data = {};
  
  String? operator [](String key) => _data[key];
  
  void operator []=(String key, String value) {
    _data[key] = value;
  }
  
  void remove(String key) {
    _data.remove(key);
  }
}

/// Global window instance for non-web platforms
final Window window = Window(); 