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
We will use the **`scrollable_positioned_list`** package instead of manual `GlobalKey` calculations for scroll synchronization. This guarantees reliability even when scrolling to categories that haven't been rendered yet (solving the lazy loading issue). We will maintain the current nested list structure for now.

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
    // Get visible items
    final positions = _itemPositionsListener.itemPositions.value;
    if (positions.isEmpty) return;

    // Find the first item that is visible on screen
    // Sort by index to find the topmost one
    final visibleIndices = positions
        .where((item) => item.itemLeadingEdge < 1 && item.itemTrailingEdge > 0)
        .map((item) => item.index)
        .toList()..sort();

    if (visibleIndices.isNotEmpty) {
      final topIndex = visibleIndices.first;
      // Map the outer list index directly to the category
      // Index 0 = Category 0, Index 1 = Category 1, etc.
      final category = menuData.categories[topIndex];
      
      context.read<MenuState>().setActiveCategory(category.id);
    }
  });
}
```

#### 2. Programmatic Scroll (Tab/Floating Menu → Category)

```dart
// In MenuPage
void scrollToCategory(String categoryId) {
  final index = menuData.categories.indexWhere((c) => c.id == categoryId);
  if (index != -1) {
    _itemScrollController.scrollTo(
      index: index,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );
    // Close floating menu if open
    context.read<MenuState>().closeFloatingMenu();
  }
}
```

#### 3. Tab Bar Auto-Scroll (Keep Active Tab Visible)

```dart
// In CategoryTabBar widget - auto-scroll tabs to keep active visible

class CategoryTabBar extends StatefulWidget {
  // ...
}

class _CategoryTabBarState extends State<CategoryTabBar> {
  final ScrollController _tabScrollController = ScrollController();
  final Map<String, GlobalKey> _tabKeys = {};

  @override
  void didUpdateWidget(CategoryTabBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.activeCategoryId != oldWidget.activeCategoryId) {
      _scrollToActiveTab();
    }
  }

  void _scrollToActiveTab() {
    if (widget.activeCategoryId == null) return;
    final key = _tabKeys[widget.activeCategoryId];
    if (key?.currentContext != null) {
      Scrollable.ensureVisible(
        key!.currentContext!,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        alignment: 0.5,  // Center the tab
      );
    }
  }
  
  // Build tabs with keys...
}
```

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

```dart
/// Horizontally scrollable category tabs - NEW FILE
/// This is genuinely new functionality with no existing equivalent

class CategoryTabBar extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: AppSpacing.pagePaddingHorizontal,
      child: Row(
        children: categories.map((cat) {
          final isActive = cat.id == activeCategoryId;
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: InkWell(
              onTap: () => onCategoryTap(cat.id),
              child: Container(
                padding: AppSpacing.buttonPadding,
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: isActive 
                          ? Theme.of(context).colorScheme.primary 
                          : Colors.transparent,
                      width: 2,
                    ),
                  ),
                ),
                child: Text(
                  cat.name.toUpperCase(),
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: isActive 
                        ? Theme.of(context).colorScheme.primary 
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
```

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

### Phase 4: Category Tab Bar & Scrollable List

**Tasks:**
- [ ] Create `CategoryTabBar` widget (StatefulWidget for internal scroll control)
- [ ] Add to `MenuPage` body above the List
- [ ] **Replace `ListView` with `ScrollablePositionedList` in `MenuPage`**
- [ ] Setup `ItemPositionsListener` in `MenuPage` initState
- [ ] Wire up `onCategoryTap` → `scrollTo`

**Files Created/Modified:**
| File | Change |
|------|--------|
| `widgets/category_tab_bar.dart` | **NEW** - ~80 lines (StatefulWidget) |
| `MenuPage.dart` | Replace ListView with ScrollablePositionedList |

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
| Rapid tab switching | scrollToCategory replaces previous scroll |
| **P4** | **Flatten List Structure** | Refactor `MenuPage` to use a single flat list instead of nested `CategorySection` lists. | **Low Priority** - Optimizes performance for large menus. |

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

### Polish (P1)
- [ ] Smooth scroll animations (400ms, easeInOut)
- [ ] Smooth collapse/expand animations (200ms)
- [ ] No feedback loop when programmatically scrolling

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
