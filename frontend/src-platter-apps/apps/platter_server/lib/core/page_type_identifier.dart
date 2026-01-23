/// Identifies the hierarchy level of a page/screen in the app.
/// 
/// Used by [BaseScreenState] to apply different behaviors based on page type,
/// such as showing/hiding the shared app bar.
enum PageType {
  /// L0 - Home/Tab pages (Orders, Tables, Menu)
  /// These pages are shown within the MainNavigation shell with shared app bar.
  homeLevel,
  
  /// L1+ - Detail pages (Order Detail, Table Detail, etc.)
  /// These pages may have their own navigation and app bar.
  detailLevel,
  
  /// Pages with no app bar (fullscreen dialogs, auth screens, etc.)
  /// A floating profile button can be shown later for settings access.
  noAppBar,
}
