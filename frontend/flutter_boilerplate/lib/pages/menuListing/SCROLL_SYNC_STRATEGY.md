# 🎯 Menu Page Scroll Sync Strategy

**Document Purpose:** Technical specification for bi-directional scroll synchronization  
**Document Version:** 2.0 (Updated with Senior Dev Recommendations)
**Status:** Approved for Implementation

---

## 📋 Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview: ScrollablePositionedList](#solution-overview)
3. [Functional Requirements](#functional-requirements)
4. [Implementation Details](#implementation-details)
5. [Edge Cases](#edge-cases)

---

## Problem Statement

We need to synchronize three components:
1.  **Horizontal Tab Bar** (Top)
2.  **Vertical Menu List** (Center)
3.  **Floating Menu Overlay** (FAB)

**Challenges with Standard `ListView`:**
1.  **Lazy Loading:** `ListView` does not render off-screen items. We cannot calculate the position of the "Desserts" category if it hasn't been rendered yet.
2.  **Variable Heights:** Menu categories have different heights (some have 5 items, some have 50). We cannot use simple math (item height * index) to scroll.

---

## Solution Overview: ScrollablePositionedList

We will use the **`scrollable_positioned_list`** package.
This package is the industry standard for "scroll to index" functionality in Flutter.

### Why this is better than manual calculation:
1.  **Handles Unrendered Items:** It can scroll to index 10 even if index 10 is not currently built.
2.  **Built-in "Spy":** It provides an `ItemPositionsListener` that tells us exactly which indices are visible on screen.
3.  **Simpler Code:** No `GlobalKeys`, no `RenderBox` math, no complex caching logic.

---

## Functional Requirements

### FR-1: Tab-to-Scroll Navigation
-   **Tapping a tab** triggers `_itemScrollController.scrollTo(index: i)`.
-   This smoothly scrolls the list so that the selected category is at the top.

### FR-2: Scroll-to-Tab Synchronization
-   **Scrolling the list** updates the active tab.
-   We listen to `_itemPositionsListener.itemPositions`.
-   We identify the **first visible index** (the category at the top).
-   We update the active tab state.

---

## Implementation Details

### 1. Dependencies
Current project has added: `scrollable_positioned_list`.

### 2. State Management (MenuState)
We remove complex scrolling logic from the Provider. The State class only holds data.

```dart
class MenuState extends ChangeNotifier {
  // ... existing fields ...
  
  // Navigation State (Simple)
  String? _activeCategoryId;
  String? get activeCategoryId => _activeCategoryId;
  
  void setActiveCategory(String id) {
    if (_activeCategoryId != id) {
      _activeCategoryId = id;
      notifyListeners();
    }
  }
}
```

### 3. View Implementation (MenuPage)

The synchronization logic lives in the View layer (`MenuPage.dart`).

```dart
class MenuPage extends StatefulWidget { ... }

class _MenuPageState extends State<MenuPage> {
  // Controllers provided by the package
  final ItemScrollController _itemScrollController = ItemScrollController();
  final ItemPositionsListener _itemPositionsListener = ItemPositionsListener.create();
  
  @override
  void initState() {
    super.initState();
    _setupScrollListener();
  }
  
  void _setupScrollListener() {
    _itemPositionsListener.itemPositions.addListener(() {
      // Get all visible item positions
      final positions = _itemPositionsListener.itemPositions.value;
      if (positions.isEmpty) return;
      
      // Find the top-most visible item
      // itemLeadingEdge < 1 means it has started entering the screen from the bottom
      // itemTrailingEdge > 0 means it hasn't fully left the screen from the top
      // We sort by index to find the first one.
      final visibleIndices = positions
          .where((item) => item.itemLeadingEdge < 1 && item.itemTrailingEdge > 0)
          .map((item) => item.index)
          .toList()..sort();
          
      if (visibleIndices.isNotEmpty) {
        final topIndex = visibleIndices.first;
        // Map index back to category ID
        final menuState = context.read<MenuState>();
        final category = menuState.menuData!.categories[topIndex];
        
        // Update active tab (debouncing optional but recommended)
        menuState.setActiveCategory(category.id);
      }
    });
  }
  
  // Method called when Tab is tapped
  void _scrollToCategory(String categoryId) {
    final menuState = context.read<MenuState>();
    final index = menuState.menuData!.categories.indexWhere((c) => c.id == categoryId);
    
    if (index != -1) {
      _itemScrollController.scrollTo(
        index: index,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          CategoryTabBar(
            onCategoryTap: _scrollToCategory,
            // ...
          ),
          Expanded(
            child: ScrollablePositionedList.builder(
              itemCount: categories.length,
              itemScrollController: _itemScrollController,
              itemPositionsListener: _itemPositionsListener,
              itemBuilder: (context, index) {
                return CategorySection(category: categories[index], ...);
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

### 4. Handling Nested Lists (Performance Note)

**Important Discussion Point:**
The current `CategorySection` contains a `ListView` with `shrinkWrap: true`.
While `scrollable_positioned_list` solves the *navigation* issue, the `shrinkWrap` issue remains a performance concern for large categories.
For now, we will proceed with the **nested structure** as requested, but we mark this as a point for future optimization (flattening the list).

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| **Categories not yet rendered** | `scrollable_positioned_list` handles this automatically. |
| **Rapid Scrolling** | The listener updates state efficiently. If needed, we can add a simple debounce (50ms). |
| **Single Category** | Scroll logic essentially does nothing, but active tab remains correct. |
| **Empty Menu** | Check for `menuData.categories.isNotEmpty` before building list. |

---

## Implementation Steps

1.  **Refactor MenuPage**: Replace `ListView` with `ScrollablePositionedList`.
2.  **Add Controllers**: Instantiate `ItemScrollController` and `ItemPositionsListener`.
3.  **Wire Up Listener**: Add the listener in `initState` to update `MenuState.activeCategoryId`.
4.  **Wire Up Scroll Action**: Connect tab taps to `_itemScrollController.scrollTo`.
5.  **Clean State**: Remove unused caching logic from `MenuState`.

