# 🍽️ Menu Page Migration Strategy (REVISED - Minimal Changes)
## From Current Design → New Design

**Document Version:** 2.1 (Revised with Senior Dev Recommendations)  
**Created:** January 13, 2026  
**Status:** Strategy Updated - Ready for Implementation

---

## 📊 Executive Summary

This document outlines a **minimal-change** migration strategy that **maximizes reuse of existing centralized widgets** while implementing new menu functionality. The focus is on functionality, not theming/styling.

### Core Principles
1. **Reuse existing widgets** (`StatusBadge`, `PriceSummaryPanel`, `PrimaryActionButton`, `PageStateView`)
2. **Extend rather than replace** (modify `ConsumerAppBar`, `CategorySection`, `MenuItemCard`)
3. **Create new only when necessary** (CategoryTabBar, FloatingMenuOverlay)
4. **Keep theming agnostic** - styling will be done separately

### 🚨 Key Update (Senior Dev Recommendation)
We will use the **`scrollable_positioned_list`** package instead of manual `GlobalKey` calculations for scroll synchronization. This guarantees reliability even when scrolling to categories that haven't been rendered yet (solving the lazy loading issue).

**Key Architecture Decision - Nested Structure Retained:**
- Each list item in `ScrollablePositionedList` is a `CategorySection` widget (which contains its own inner lists of subcategories/items)
- **Index 0** = "Food Category Section" (entire category with all its subcategories)
- **Index 1** = "Drinks Category Section" (entire category with all its subcategories)
- This creates a **perfect 1-to-1 mapping** between list indices and the `categories` array
- Implementation is simple: `index == categoryIndex`, no offset math needed
- **Trade-off:** Not a fully flat virtualized list, but acceptable for typical menu sizes

> **P4 Optimization (Future):** Flatten to single list with mixed item types for better virtualization on very large menus.

---

## 🎯 Design Comparison

| Component | Current | New | Approach |
|-----------|---------|-----|----------|
| **Header** | `ConsumerAppBar` with title | Rich header with restaurant info | **Extend** ConsumerAppBar |
| **OTP Badge** | None | OTP display (conditional) | **Reuse** `StatusBadge.custom()` |
| **Category Nav** | None | Horizontal scrollable tabs | **New** widget needed |
| **Offers Section** | None | Optional carousel | **TODO** - placeholder only |
| **Menu Structure** | Expanded subcategories | Collapsible subcategories | **Modify** CategorySection |
| **Item Display** | `MenuItemCard` | Same + optional image | **Modify** MenuItemCard |
| **Cart Summary** | `FloatingCartWidget` | Fixed bottom bar | **Reuse** `PriceSummaryPanel` |
| **Loading/Error** | Custom views | Centralized views | **Reuse** `PageStateView` |
| **Floating Menu** | None | Category quick-nav | **New** widget needed |

---

## 🏗️ Architecture Overview

### Widget Reuse Analysis

| Existing Widget | Location | Can Reuse? | Changes Needed |
|-----------------|----------|------------|----------------|
| `ConsumerAppBar` | `/widgets/` | ✅ Yes | Add `titleWidget` param for custom leading content |
| `StatusBadge` | `/widgets/` | ✅ Yes | None - use `.custom()` factory for OTP |
| `PriceDisplay` | `/widgets/` | ✅ Yes | None - already used in MenuItemCard |
| `QuantitySelector` | `/widgets/` | ✅ Yes | None - already used |
| `PriceSummaryPanel` | `/widgets/` | ✅ Yes | Use for cart summary bar |
| `PrimaryActionButton` | `/widgets/` | ✅ Yes | Use for Checkout button |
| `PageStateView` | `/widgets/` | ✅ Yes | Replace `MenuLoadingView` & `MenuErrorView` |
| `MenuItemCard` | `/menuListing/` | ✅ Yes | Add `showImage` param |
| `CategorySection` | `/menuListing/` | ✅ Yes | Add collapse state support |
| `FloatingCartWidget` | `/menuListing/` | ❌ Replace | Use `PriceSummaryPanel` instead |
| `MenuLoadingView` | `/menuListing/` | ❌ Delete | Use `PageStateView.loading()` |
| `MenuErrorView` | `/menuListing/` | ❌ Delete | Use `PageStateView.error()` |

### New Widgets Required (2 new files)

| Widget | Location | Why New? |
|--------|----------|----------|
| `CategoryTabBar` | `/widgets/category_tab_bar.dart` | Horizontal scroll tabs - no existing equivalent |
| `FloatingMenuOverlay` | `/menuListing/widgets/floating_menu_overlay.dart` | FAB + overlay combo - **separate file** |

### Updated Widget Tree Structure

```
MenuPage (MODIFIED)
├── initState: Setup ItemPositionsListener
│
├── Scaffold
│   ├── ConsumerAppBar (EXTENDED)
│   │   ├── titleWidget: Column (restaurant name, table info)
│   │   │   ├── Row: [RestaurantName] [StatusBadge.custom(OTP)]
│   │   │   └── Text: "TABLE 4 • GUESTS 6"
│   │   └── actions: [SearchIcon, CartIcon]
│   │
│   ├── Body: Column
│   │   ├── CategoryTabBar (NEW - /widgets/category_tab_bar.dart)
│   │   │   ├── Internal ScrollController for tab scrolling
│   │   │   ├── Auto-scrolls to keep active tab visible
│   │   │   └── Horizontal scroll: [FOOD] [BEVERAGES] [DESSERT]
│   │   │
│   │   ├── // TODO: OffersCarousel placeholder
│   │   │
│   │   └── Expanded: ScrollablePositionedList (REPLACES ListView)
│   │       ├── itemScrollController: _itemScrollController
│   │       ├── itemPositionsListener: _itemPositionsListener
│   │       └── itemBuilder: (index) => CategorySection (MODIFIED)
│   │           ├── Category header
│   │           └── Subcategory sections (MODIFIED)
│   │               ├── Collapsible header (tap to expand)
│   │               └── AnimatedCrossFade for items
│   │                   └── MenuItemCard (MODIFIED - showImage param)
│   │
│   └── PriceSummaryPanel (REUSE from /widgets/)
│       ├── Cart total row
│       └── PrimaryActionButton: "Checkout"
│
└── FloatingMenuOverlay (NEW - /menuListing/widgets/floating_menu_overlay.dart)
    ├── FloatingActionButton (menu_book / close icon)
    └── Positioned overlay with category list
```

### State Management Additions (Minimal)

Add the following to **existing** `MenuState` class:

```dart
// === ADD TO EXISTING MenuState class ===

// --- Navigation State ---
String? _activeCategoryId;
String? get activeCategoryId => _activeCategoryId;

void setActiveCategory(String id) {
  if (_activeCategoryId != id) {
    _activeCategoryId = id;
    notifyListeners();
  }
}

// --- Collapse State (default: all collapsed) ---
final Set<String> _expandedSubcategoryIds = {};

bool isSubcategoryExpanded(String id) => _expandedSubcategoryIds.contains(id);

void toggleSubcategory(String id) {
  if (_expandedSubcategoryIds.contains(id)) {
    _expandedSubcategoryIds.remove(id);
  } else {
    _expandedSubcategoryIds.add(id);
  }
  notifyListeners();
}

// --- Floating Menu State ---
bool _isFloatingMenuExpanded = false;
bool get isFloatingMenuExpanded => _isFloatingMenuExpanded;

void toggleFloatingMenu() {
  _isFloatingMenuExpanded = !_isFloatingMenuExpanded;
  notifyListeners();
}

void closeFloatingMenu() {
  if (_isFloatingMenuExpanded) {
    _isFloatingMenuExpanded = false;
    notifyListeners();
  }
}
```

**Note:** `tableContext` data will be added to `MenuData` model, not separate state.

---

## 🎯 CRITICAL: Scroll Sync Implementation (P0)

This is the most important feature - must be smooth and bug-free. We use `scrollable_positioned_list` to handle this reliably without manual math or race conditions.

### Why `scrollable_positioned_list`?

| Problem with Manual Approach | Solution with Package |
|------------------------------|----------------------|
| `GlobalKey` calculations fail for lazy-loaded items | `scrollTo(index)` works even for unrendered items |
| Complex offset math with nested widgets | Simple index-based navigation |
| Race conditions during rapid scrolling | Built-in scroll controller handles timing |
| Manual position tracking error-prone | `ItemPositionsListener` gives exact visible items |

### How the 1-to-1 Mapping Works

```
ScrollablePositionedList itemBuilder:
┌─────────────────────────────────────────────────────────┐
│ index: 0  →  categories[0]  →  CategorySection("Food")  │
│              └── Contains: Starters, Mains, etc.        │
├─────────────────────────────────────────────────────────┤
│ index: 1  →  categories[1]  →  CategorySection("Drinks")│
│              └── Contains: Hot, Cold, etc.              │
├─────────────────────────────────────────────────────────┤
│ index: 2  →  categories[2]  →  CategorySection("Dessert")│
│              └── Contains: Ice Cream, Cakes, etc.       │
└─────────────────────────────────────────────────────────┘
```

This means:
- **Tab tap** → `scrollTo(index: categoryIndex)` - direct mapping, no math
- **Scroll spy** → `positions.first.index` gives us the category index directly

### Implementation Approach

#### 1. Setup in MenuPage

```dart
// In MenuPage state
final ItemScrollController _itemScrollController = ItemScrollController();
final ItemPositionsListener _itemPositionsListener = ItemPositionsListener.create();

@override
void initState() {
  super.initState();
  _setupScrollListener();
}

void _setupScrollListener() {
  _itemPositionsListener.itemPositions.addListener(() {
    final positions = _itemPositionsListener.itemPositions.value;
    if (positions.isEmpty) return;

    // Find items that are actually visible on screen
    // itemLeadingEdge < 1 means top of item is above viewport bottom
    // itemTrailingEdge > 0 means bottom of item is below viewport top
    final visibleIndices = positions
        .where((item) => item.itemLeadingEdge < 1 && item.itemTrailingEdge > 0)
        .map((item) => item.index)
        .toList()..sort();

    if (visibleIndices.isNotEmpty) {
      final topIndex = visibleIndices.first;
      
      // ✨ MAGIC: Direct 1-to-1 mapping!
      // topIndex == categoryIndex because each list item IS a CategorySection
      // No offset calculations, no nested index math
      if (topIndex < menuData.categories.length) {
        final category = menuData.categories[topIndex];
        context.read<MenuState>().setActiveCategory(category.id);
      }
    }
  });
}
```

#### 1b. Build the ScrollablePositionedList

```dart
// In MenuPage build method - replaces old ListView.builder
ScrollablePositionedList.builder(
  itemScrollController: _itemScrollController,
  itemPositionsListener: _itemPositionsListener,
  itemCount: menuData.categories.length,  // 1-to-1 with categories
  itemBuilder: (context, index) {
    // index 0 = categories[0], index 1 = categories[1], etc.
    final category = menuData.categories[index];
    return CategorySection(
      category: category,
      menuItemsMap: menuData.menuItems,
      itemQuantities: cartState.itemQuantities,
      onQuantityChanged: (itemId, qty) => /* ... */,
      tableId: tableId,
      restaurantId: restaurantId,
      isSubcategoryExpanded: menuState.isSubcategoryExpanded,
      onSubcategoryToggle: menuState.toggleSubcategory,
      showImages: menuData.tableContext?.showImages ?? false,
    );
  },
)
```

#### 2. Programmatic Scroll (Tab/Floating Menu → Category)

```dart
// In MenuPage - called when user taps a category tab or floating menu item
void scrollToCategory(String categoryId) {
  // Find the index in categories array
  final index = menuData.categories.indexWhere((c) => c.id == categoryId);
  
  if (index != -1) {
    // ✨ Direct scroll - index IS the category position
    // No need to calculate cumulative item counts or nested offsets
    _itemScrollController.scrollTo(
      index: index,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );
    
    // Update active state immediately for responsive UI
    context.read<MenuState>().setActiveCategory(categoryId);
    
    // Close floating menu if it was open
    context.read<MenuState>().closeFloatingMenu();
  }
}
```

**Why this works reliably:**
- `scrollTo(index)` works even if that `CategorySection` hasn't been rendered yet
- The package handles virtualization internally - no lazy loading issues
- Animation is smooth because there's no "jump and adjust" behavior

#### 3. Tab Bar Auto-Scroll (Keep Active Tab Visible)

The tab bar has its own horizontal scroll. When the user scrolls the menu and the active category changes, the tab bar should auto-scroll to keep the active tab visible.

```dart
// In CategoryTabBar widget - auto-scroll tabs to keep active visible

class CategoryTabBar extends StatefulWidget {
  const CategoryTabBar({
    required this.categories,
    required this.activeCategoryId,
    required this.onCategoryTap,
    super.key,
  });
  
  final List<Category> categories;
  final String? activeCategoryId;
  final void Function(String categoryId) onCategoryTap;
  
  @override
  State<CategoryTabBar> createState() => _CategoryTabBarState();
}

class _CategoryTabBarState extends State<CategoryTabBar> {
  final Map<String, GlobalKey> _tabKeys = {};

  @override
  void initState() {
    super.initState();
    // Create a GlobalKey for each tab to enable ensureVisible
    for (final cat in widget.categories) {
      _tabKeys[cat.id] = GlobalKey();
    }
  }

  @override
  void didUpdateWidget(CategoryTabBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    // When active category changes (from scroll spy), auto-scroll tab bar
    if (widget.activeCategoryId != oldWidget.activeCategoryId) {
      _scrollToActiveTab();
    }
  }

  void _scrollToActiveTab() {
    if (widget.activeCategoryId == null) return;
    final key = _tabKeys[widget.activeCategoryId];
    if (key?.currentContext != null) {
      // Smoothly scroll the tab bar to center the active tab
      Scrollable.ensureVisible(
        key!.currentContext!,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        alignment: 0.5,  // 0.5 = center the tab in view
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: AppSpacing.pagePaddingHorizontal,
      child: Row(
        children: widget.categories.map((cat) {
          final isActive = cat.id == widget.activeCategoryId;
          return Container(
            key: _tabKeys[cat.id],  // Assign key for ensureVisible
            // ... rest of tab styling
          );
        }).toList(),
      ),
    );
  }
}
```

### Bidirectional Sync Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCROLL SYNC FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USER SCROLLS MENU                    USER TAPS TAB/FAB         │
│        │                                     │                  │
│        ▼                                     ▼                  │
│  ItemPositionsListener              scrollToCategory(id)        │
│  detects topmost visible                     │                  │
│        │                                     │                  │
│        ▼                                     ▼                  │
│  topIndex = visible[0].index       index = categories.indexOf  │
│        │                                     │                  │
│        ▼                                     ▼                  │
│  category = categories[topIndex]   _itemScrollController.scrollTo│
│        │                                     │                  │
│        ▼                                     ▼                  │
│  setActiveCategory(category.id)    setActiveCategory(id)        │
│        │                                     │                  │
│        └──────────────┬──────────────────────┘                  │
│                       ▼                                         │
│              MenuState.activeCategoryId                         │
│                       │                                         │
│                       ▼                                         │
│              CategoryTabBar rebuilds                            │
│              _scrollToActiveTab() called                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Package Dependencies

Add the following to `pubspec.yaml`:

```yaml
dependencies:
  scrollable_positioned_list: ^0.3.8  # For scroll-to-index and position listening
```

Run `flutter pub get` after adding.

---

## 📦 Data Requirements (Minimal Changes)

### Backend: Add `tableContext` to Menu API Response

```javascript
// In getRestaurantMenu.js - ADD after line ~113

// Build table context for frontend header
const tableContext = {
  restaurantName: restaurantData.name,
  tableNumber: tableData?.number || tableId,
  maxOccupancy: tableData?.capacity || null,  // TODO: show if available
  showImages: restaurantData.showImages || false,
  otp: null,
  showOtp: false,
};

// OTP logic: only if otpRequiredForOrder=true AND active session
if (restaurantData.otpRequiredForOrder && data.sessionId) {
  const otpCode = tableData?.currentOTP?.code;
  if (otpCode) {
    tableContext.otp = otpCode;
    tableContext.showOtp = true;
  }
}

organizedMenu.tableContext = tableContext;
```

### Frontend: Update MenuData Model (in menu_response.dart)

```dart
// ADD to existing MenuData class - NO new file needed

@freezed
class MenuData with _$MenuData {
  factory MenuData({
    required List<Category> categories,
    required Map<String, List<MenuItem>> menuItems,
    required MenuMetadata metadata,
    ActiveMenu? activeMenu,
    TableContextData? tableContext,  // ADD THIS LINE
  }) = _MenuData;
  // ... existing fromJson
}

// ADD this class to the SAME file (menu_response.dart)
@freezed
class TableContextData with _$TableContextData {
  const factory TableContextData({
    required String restaurantName,
    required String tableNumber,
    int? maxOccupancy,           // TODO: display if available
    String? otp,                 // null when showOtp=false
    @Default(false) bool showOtp,
    @Default(false) bool showImages,
  }) = _TableContextData;

  factory TableContextData.fromJson(Map<String, dynamic> json) =>
      _$TableContextDataFromJson(json);
}
```

### Data Field Summary

| Field | Source | Nullable | Display Logic |
|-------|--------|----------|---------------|
| `restaurantName` | Restaurant doc | No | Always show |
| `tableNumber` | Table doc or tableId | No | Always show |
| `maxOccupancy` | Table `capacity` | Yes | **TODO:** Show if available |
| `otp` | Table `currentOTP.code` | Yes | Show only if `showOtp=true` |
| `showOtp` | Computed | No | `otpRequiredForOrder && hasSession` |
| `showImages` | Restaurant doc | No | Controls image display in items |

---

## 🧩 Widget Changes Specification

### 1. ConsumerAppBar - EXTEND (in `/widgets/consumer_app_bar.dart`)

```dart
// ADD optional titleWidget parameter to ConsumerAppBar

class ConsumerAppBar extends StatelessWidget implements PreferredSizeWidget {
  const ConsumerAppBar({
    this.title,              // CHANGE: make optional
    this.titleWidget,        // ADD: custom widget for complex headers
    this.onOrdersTap,
    this.onMenuTap,
    this.onCartTap,
    this.onOffersTap,        // ADD
    this.onSearchTap,        // ADD
    this.cartItemCount,      // ADD: for badge
    this.leading,
    this.leadingActions = const <Widget>[],
    super.key,
  });

  final String? title;
  final Widget? titleWidget;  // NEW - takes precedence over title
  final VoidCallback? onOffersTap;  // NEW
  final VoidCallback? onSearchTap;  // NEW
  final int? cartItemCount;  // NEW - show badge if > 0
  // ... existing fields

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: titleWidget ?? (title != null ? Text(title!) : null),
      // ... add offers/search icons to actions
      // ... add badge to cart icon if cartItemCount > 0
    );
  }
}
```

**Usage in MenuPage:**
```dart
ConsumerAppBar(
  titleWidget: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(children: [
        Text(tableContext.restaurantName),
        if (tableContext.showOtp) StatusBadge.custom(label: 'OTP ${tableContext.otp}'),
      ]),
      Text('TABLE ${tableContext.tableNumber}'),
    ],
  ),
  onOffersTap: () {},  // TODO: navigate to offers
  onSearchTap: () {},  // TODO: search
  onCartTap: () => context.go('/r/$rid/t/$tid/cart'),
  cartItemCount: cartItemCount,
)
```

### 2. MenuItemCard - MODIFY (in `menu_widgets.dart`)

```dart
// ADD showImage parameter to MenuItemCard

class MenuItemCard extends StatelessWidget {
  const MenuItemCard({
    required this.item,
    required this.quantity,
    required this.onQuantityChanged,
    required this.tableId,
    required this.restaurantId,
    this.showImage = false,  // ADD - default false
    super.key,
  });

  final bool showImage;  // ADD

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Row(
        children: [
          Expanded(child: _MenuItemDetails(item: item)),
          // ADD: Show image if showImage=true AND image exists
          if (showImage && item.meta.image != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                item.meta.image!,
                width: 80,
                height: 80,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          _QuantityControl(...),
        ],
      ),
    );
  }
}
```

### 3. CategorySection - MODIFY (in `menu_widgets.dart`)

```dart
// ADD collapse state support (Removed manual GlobalKey logic)

class CategorySection extends StatelessWidget {
  const CategorySection({
    required this.category,
    required this.menuItemsMap,
    required this.itemQuantities,
    required this.onQuantityChanged,
    required this.tableId,
    required this.restaurantId,
    this.isSubcategoryExpanded,        // ADD - callback
    this.onSubcategoryToggle,          // ADD - callback
    this.showImages = false,           // ADD
    super.key,
  });

  final bool Function(String subcategoryId)? isSubcategoryExpanded;  // ADD
  final void Function(String subcategoryId)? onSubcategoryToggle;    // ADD
  final bool showImages;  // ADD

  List<Widget> _buildSubcategorySections(BuildContext context) {
    final sections = <Widget>[];
    for (final subcat in category.subcategories) {
      final subcatItems = menuItemsMap[subcat.id] ?? [];
      if (subcatItems.isEmpty) continue;
      
      final isExpanded = isSubcategoryExpanded?.call(subcat.id) ?? true;
      
      // Subcategory header (tappable to expand/collapse)
      sections.add(
        InkWell(
          onTap: () => onSubcategoryToggle?.call(subcat.id),
          child: Padding(
            padding: AppSpacing.listItemPadding,
            child: Row(
              children: [
                Icon(isExpanded ? Icons.expand_more : Icons.chevron_right),
                AppSpacing.horizontalSM,
                Text(subcat.name, style: ...),
              ],
            ),
          ),
        ),
      );
      
      // Items (animated collapse)
      sections.add(
        AnimatedCrossFade(
          firstChild: const SizedBox.shrink(),
          secondChild: _buildItemsList(subcatItems),
          crossFadeState: isExpanded 
              ? CrossFadeState.showSecond 
              : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
      );
    }
    return sections;
  }
}
```

### 4. CategoryTabBar - NEW (in `/widgets/category_tab_bar.dart`)

> **See complete implementation in [Scroll Sync Implementation](#-critical-scroll-sync-implementation-p0) section above.**

The `CategoryTabBar` is a `StatefulWidget` that:
- Displays horizontal scrollable category tabs
- Highlights the active category
- **Auto-scrolls horizontally** to keep the active tab visible when user scrolls the menu
- Uses `GlobalKey` per tab + `Scrollable.ensureVisible` for auto-scroll

Key features:
- `onCategoryTap` callback → triggers `scrollToCategory()` in MenuPage
- `didUpdateWidget` detects when `activeCategoryId` changes → calls `_scrollToActiveTab()`

### 5. FloatingMenuOverlay - NEW (separate file: `menuListing/widgets/floating_menu_overlay.dart`)

```dart
/// Floating menu button + overlay - SEPARATE FILE
/// Combines FAB and overlay in one stateless widget

class FloatingMenuOverlay extends StatelessWidget {
  const FloatingMenuOverlay({
    required this.isExpanded,
    required this.categories,
    required this.onToggle,
    required this.onCategoryTap,
    super.key,
  });

  final bool isExpanded;
  final List<Category> categories;
  final VoidCallback onToggle;
  final void Function(String categoryId) onCategoryTap;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Dismiss layer when expanded
        if (isExpanded)
          Positioned.fill(
            child: GestureDetector(
              onTap: onToggle,
              child: const ColoredBox(color: Colors.transparent),
            ),
          ),
        
        // Category list overlay
        if (isExpanded)
          Positioned(
            bottom: 80,  // Above FAB
            right: AppSpacing.lg,
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(16),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.3,
                  maxWidth: 200,
                ),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: categories.length,
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    return ListTile(
                      title: Text(cat.name),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => onCategoryTap(cat.id),
                    );
                  },
                ),
              ),
            ),
          ),
        
        // FAB
        Positioned(
          bottom: AppSpacing.lg,
          right: AppSpacing.lg,
          child: FloatingActionButton(
            onPressed: onToggle,
            child: Icon(isExpanded ? Icons.close : Icons.menu_book),
          ),
        ),
      ],
    );
  }
}
```

### 6. Cart Summary - REUSE PriceSummaryPanel (NO new widget)

```dart
// In MenuPage, replace FloatingCartWidget with:

PriceSummaryPanel(
  summaryRows: [
    Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Cart Total', style: theme.textTheme.labelLarge),
        Text('$itemCount items', style: theme.textTheme.bodyMedium),
      ],
    ),
    PriceDisplay(
      finalPrice: totalAmount,
      size: PriceDisplaySize.large,
    ),
  ],
  primaryAction: PrimaryActionButton(
    label: 'Checkout',
    onPressed: () => context.go('/r/$rid/t/$tid/cart'),
  ),
)
```

### 7. Loading/Error - REUSE PageStateView (DELETE custom views)

```dart
// In MenuPage, replace:
// - MenuLoadingView → PageStateView.loading()
// - MenuErrorView → PageStateView.error(primaryAction: ...)

// DELETE MenuLoadingView and MenuErrorView from menu_widgets.dart
```

---

## 📋 Implementation Phases (Simplified)

### Phase 1: Data Layer (Backend + Frontend Models)

**Tasks:**
- [ ] **Backend:** Add `tableContext` to `getRestaurantMenu.js` response
- [ ] **Frontend:** Add `TableContextData` class to `menu_response.dart` (same file)
- [ ] **Frontend:** Update `MenuData` to include `tableContext` field
- [ ] **Frontend:** Update `fromJson` parsing in `MenuData`
- [ ] Run `build_runner` to regenerate freezed files

**Files Modified:**
| File | Change |
|------|--------|
| `backend/.../getRestaurantMenu.js` | Add ~15 lines for tableContext |
| `frontend/.../menu_response.dart` | Add TableContextData class (~15 lines) |

---

### Phase 2: State Management + Scroll Sync (CRITICAL)

**Tasks:**
- [ ] Add navigation state to `MenuState` (activeCategoryId)
- [ ] Add collapse state to `MenuState` (expandedSubcategoryIds set)
- [ ] Add floating menu state to `MenuState` (isExpanded flag)
- [ ] **Remove legacy scroll logic from State** (move to View with new library)

**Files Modified:**
| File | Change |
|------|--------|
| `menu_state.dart` | Add simple state / Remove old scroll logic |

---

### Phase 3: Header (Extend ConsumerAppBar)

**Tasks:**
- [ ] Add `titleWidget` parameter to `ConsumerAppBar`
- [ ] Add `onOffersTap`, `onSearchTap` optional callbacks
- [ ] Add `cartItemCount` for badge display
- [ ] Update `MenuPage` to use extended ConsumerAppBar with tableContext

**Files Modified:**
| File | Change |
|------|--------|
| `widgets/consumer_app_bar.dart` | Add ~20 lines for new params |
| `MenuPage.dart` | Update AppBar usage (~15 lines) |

---

### Phase 4: Category Tab Bar & Scrollable List (CRITICAL)

**Package Dependency:**
- [ ] Add `scrollable_positioned_list: ^0.3.8` to pubspec.yaml
- [ ] Run `flutter pub get`

**Tasks:**
- [ ] Create `CategoryTabBar` widget (StatefulWidget for internal scroll control + auto-scroll)
- [ ] Add `CategoryTabBar` to `MenuPage` body above the list
- [ ] **Replace `ListView.builder` with `ScrollablePositionedList.builder`** in `MenuPage`
- [ ] Create `ItemScrollController` and `ItemPositionsListener` in `MenuPage` state
- [ ] Setup `_setupScrollListener()` in `initState` for scroll spy (updates activeCategoryId)
- [ ] Implement `scrollToCategory(String categoryId)` method
- [ ] Wire up `CategoryTabBar.onCategoryTap` → `scrollToCategory`
- [ ] Wire up `FloatingMenuOverlay.onCategoryTap` → `scrollToCategory` (in Phase 7)

**Key Implementation Note:**
Each `CategorySection` is one item in the list. Index 0 = Category 0, Index 1 = Category 1.
No offset math needed - direct 1-to-1 mapping.

**Files Created/Modified:**
| File | Change |
|------|--------|
| `pubspec.yaml` | Add scrollable_positioned_list dependency |
| `widgets/category_tab_bar.dart` | **NEW** - ~100 lines (StatefulWidget with auto-scroll) |
| `MenuPage.dart` | Replace ListView with ScrollablePositionedList, add controllers |

---

### Phase 5: Collapsible Subcategories (Modify CategorySection)

**Tasks:**
- [ ] Add `isSubcategoryExpanded` callback param to CategorySection
- [ ] Add `onSubcategoryToggle` callback param
- [ ] Add `showImages` param (passed to MenuItemCard)
- [ ] Modify `_buildSubcategorySections` to use AnimatedCrossFade
- [ ] Add chevron icon to subcategory headers

**Files Modified:**
| File | Change |
|------|--------|
| `menu_widgets.dart` (CategorySection) | Modify ~40 lines |
| `MenuPage.dart` | Pass new params to CategorySection |

---

### Phase 6: Menu Item Images (Modify MenuItemCard)

**Tasks:**
- [ ] Add `showImage` parameter to `MenuItemCard`
- [ ] Conditionally render image when `showImage && item.meta.image != null`
- [ ] Use `Image.network` with error builder

**Files Modified:**
| File | Change |
|------|--------|
| `menu_widgets.dart` (MenuItemCard) | Add ~15 lines for image |

---

### Phase 7: Floating Menu (Separate File)

**Tasks:**
- [ ] Create `FloatingMenuOverlay` widget in separate file
- [ ] Includes FAB + positioned overlay + dismiss handling
- [ ] FAB icon toggles between `menu_book` and `close`
- [ ] Overlay positioned above FAB, right-aligned
- [ ] Overlay height ~30% of screen, scrollable
- [ ] Wire up in `MenuPage` Stack
- [ ] Connect `onCategoryTap` → `scrollTo`

**Files Created/Modified:**
| File | Change |
|------|--------|
| `menuListing/widgets/floating_menu_overlay.dart` | **NEW** - ~80 lines |
| `MenuPage.dart` | Add to Stack |

---

### Phase 8: Cart Summary (Reuse PriceSummaryPanel)

**Tasks:**
- [ ] Replace `FloatingCartWidget` with `PriceSummaryPanel` + `PrimaryActionButton`
- [ ] Move from Stack/Positioned to Column layout (fixed at bottom)
- [ ] Delete unused `FloatingCartWidget` class

**Files Modified:**
| File | Change |
|------|--------|
| `MenuPage.dart` | Replace cart widget usage |
| `menu_widgets.dart` | Delete FloatingCartWidget (~80 lines removed) |

---

### Phase 9: Cleanup & Testing

**Tasks:**
- [ ] Delete `MenuLoadingView` - use `PageStateView.loading()`
- [ ] Delete `MenuErrorView` - use `PageStateView.error()`
- [ ] Test all menu structures (with/without subcategories)
- [ ] Test OTP display (otpRequired + session)
- [ ] Test image display (showImages + imageUrl)
- [ ] Test collapse/expand
- [ ] Test scroll-to-category
- [ ] Test floating menu

**Files Modified:**
| File | Change |
|------|--------|
| `menu_widgets.dart` | Delete ~50 lines (loading/error views) |
| `MenuPage.dart` | Use PageStateView instead |

---

## 📝 TODO Items (Future Implementation)

| Priority | Item | Description | Notes |
|----------|------|-------------|-------|
| **P1** | Offers Carousel | Horizontal offers below tabs | Needs Offers API |
| **P1** | Guest Count Display | Show maxOccupancy in header | Check if field exists in DB |
| **P2** | Auto-expand First Subcategory | On load, expand first subcategory of first category | Post-MVP |
| **P2** | Search Functionality | Search icon → search overlay | Post-MVP |
| **P3** | Nested Subcategories in Floating Menu | Show subcategories in overlay when tapping category | Post-MVP |
| **P4** | Flatten List Structure | Refactor to single flat list with mixed item types | Better virtualization for very large menus |
## ⚠️ Edge Cases (Covered by Implementation)

| Edge Case | Handling |
|-----------|----------|
| Categories without subcategories | Show items directly (existing behavior preserved) |
| Empty subcategories | Skip - don't show empty collapsible sections |
| Single category | Tab bar still shows - acceptable |
| `otpRequiredForOrder=false` | OTP badge hidden |
| No active session | OTP badge hidden even if OTP exists |
| `showImages=false` | Never show images |
| `showImages=true` but no image | No placeholder, just hide image area |
| Image URL broken | Use errorBuilder to hide gracefully |
| Very few items | Tab taps still work, scroll not needed |
| Rapid tab switching | `scrollTo` replaces previous animation - no queue buildup |
| Scroll to unrendered category | `scrollable_positioned_list` handles this automatically |
| User scrolls during programmatic scroll | User scroll wins, animation interrupted gracefully |
| Very tall CategorySection | Position listener reports it as active until scrolled past |
| First category fills entire screen | Only first tab active until user scrolls significantly |

---

## ✅ Acceptance Criteria

### Functional (P0)
- [ ] Header displays restaurant name, table number
- [ ] OTP badge shows only when `otpRequiredForOrder=true` AND session active
- [ ] Horizontal category tabs with tap-to-scroll
- [ ] **Active tab syncs with scroll position** (smooth, no jank)
- [ ] **Tab bar auto-scrolls to keep active tab visible**
- [ ] All subcategories collapsed by default
- [ ] Tap subcategory header to expand/collapse
- [ ] Images show only when `showImages=true` AND image URL exists
- [ ] Floating menu button opens category overlay
- [ ] Tap category in overlay scrolls to that section and closes overlay
- [ ] Cart summary shows at bottom using PriceSummaryPanel
- [ ] Checkout button navigates to cart

### Scroll Sync (P0 - Critical)
- [ ] **Tap tab → menu scrolls to that category section**
- [ ] **Scroll menu → active tab updates to reflect topmost visible category**
- [ ] **Active tab auto-scrolls horizontally to stay centered**
- [ ] **Tap FAB menu item → menu scrolls + FAB overlay closes**
- [ ] **Scrolling to last category works** (even if not yet rendered)
- [ ] No "jump and adjust" behavior - smooth single animation

### Polish (P1)
- [ ] Smooth scroll animations (400ms, easeInOut)
- [ ] Smooth collapse/expand animations (200ms)
- [ ] Tab bar auto-scroll is subtle (200ms, easeOut)
- [ ] No feedback loop when programmatically scrolling (setActiveCategory called once)

### Future Ready
- [ ] `subcategoryKeys` map in place for future subcategory scroll
- [ ] `scrollToSubcategory()` method ready (expand + scroll)

### Placeholders (Included but Non-Functional)
- [x] Search icon in header (placeholder - shows toast "Coming soon")
- [ ] TODO comment for offers carousel location

---

## 🚀 Implementation Order

**Recommended sequence:**
1. **Phase 1** (Data) → Backend + Models
2. **Phase 2** (State) → MenuState additions
3. **Phase 3** (Header) → ConsumerAppBar extension
4. **Phase 4** (TabBar) → New CategoryTabBar widget
5. **Phase 5** (Collapsible) → CategorySection modifications
6. **Phase 6** (Images) → MenuItemCard modifications
7. **Phase 7** (FloatingMenu) → Add FloatingMenuOverlay
8. **Phase 8** (Cart) → Replace with PriceSummaryPanel
9. **Phase 9** (Cleanup) → Delete old widgets, test

Each phase is independently testable.
