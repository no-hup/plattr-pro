# AI Agent Prompt Template: Flow Documentation Generator

Use this prompt to generate comprehensive HTML documentation for any main flow in the Plattr Pro system.

---

## PROMPT START

```
You are a technical documentation expert. Your task is to create a comprehensive, standalone HTML documentation page for the **[FLOW_NAME]** flow in the Plattr Pro restaurant ordering platform.

## CONTEXT
Plattr Pro is a Firebase-based restaurant ordering system with:
- Flutter web consumer app
- Firebase Cloud Functions backend
- Firestore database
- Multi-user table sessions
- OTP-based authentication

The codebase is located at: `/backend/src-plattr/functions/`
Key modules: table, server, customer, cart, menu, orders, session

## YOUR TASK
Analyze the relevant code files and create an HTML documentation page for the **[FLOW_NAME]** flow that includes ALL of the following sections:

---

### 1. SPECS SECTION (CRITICAL - Must be first after header)
Create a "📋 SPECS" section that provides a complete, encapsulated specification of the flow. This should be:
- **Self-contained**: A developer should understand the entire flow just from this section
- **Structured as a numbered specification document**
- **Include all key facts, rules, and constraints**

Format the SPECS as:
```
SPEC-001: [Concise rule/fact]
SPEC-002: [Concise rule/fact]
...
```

Example SPECS structure:
- SPEC-001 to SPEC-010: Core flow description (what happens step by step)
- SPEC-011 to SPEC-020: Data structures involved
- SPEC-021 to SPEC-030: Feature flags and their effects
- SPEC-031 to SPEC-040: Validation rules
- SPEC-041 to SPEC-050: Error cases and codes
- SPEC-051 to SPEC-060: Cross-entity side effects
- SPEC-061 to SPEC-070: Edge cases and special handling

---

### 2. ENTITIES INVOLVED
List ALL entities (Firestore collections/documents) that are read or written during this flow:
- Entity name and icon
- What fields are accessed/modified
- Read vs Write operations
- Relationships to other entities

---

### 3. FEATURE FLAGS
Document ALL feature flags that affect this flow:
- Flag name
- ON behavior
- OFF behavior  
- Impact on user experience
- Default value

---

### 4. MAIN FLOW DIAGRAM
Create an EXHAUSTIVE Mermaid flowchart that includes:
- Every decision point (use rhombus shapes)
- Every feature flag check (prefix with 🚩)
- Every API call
- Every error state (in red subgraph)
- Every entity update
- Loops and retry logic
- Parallel operations if any

Use subgraphs to group related steps. Apply distinct colors to each subgraph.

---

### 5. NUANCES & EDGE CASES (Bullet Points)
Use visual markers for different types:
- ✓ (green) - Success cases, happy path notes
- → (default) - Normal flow information
- ⚠ (yellow) - Edge cases, special handling
- ✗ (red) - Error cases, failure modes

Group bullets by category:
- Validation nuances
- State management nuances
- Concurrency nuances
- Recovery scenarios
- Performance considerations

---

### 6. CROSS-ENTITY EFFECTS
Create a matrix table showing:
- Rows: Events/actions in this flow
- Columns: Each entity (Table, Session, Customer, Cart, Order, etc.)
- Cells: What changes in each entity for each event

---

### 7. STATE MACHINES
For any entity with distinct states, create a Mermaid stateDiagram showing:
- All possible states
- Transitions between states
- Triggers for each transition

---

### 8. API REFERENCE
Table with columns:
- Function name (as code)
- Module
- Parameters
- Returns
- Side effects (what entities are modified)

---

### 9. ERROR HANDLING
Table with columns:
- Error scenario
- HTTP code
- Error message
- User experience
- Recovery path

---

## HTML STRUCTURE REQUIREMENTS

### File Organization
```html
<!DOCTYPE html>
<html>
<head>
    <!-- Mermaid CDN, Google Fonts (Inter), CSS variables -->
</head>
<body>
    <nav class="nav"><!-- Fixed navigation with section links --></nav>
    <div class="container">
        <header><!-- Title, description, badges --></header>
        
        <section id="specs"><!-- SPECS section - FIRST --></section>
        <section id="entities"><!-- Entities --></section>
        <section id="flags"><!-- Feature flags --></section>
        <section id="main-flow"><!-- Main diagram --></section>
        <section id="nuances"><!-- Bullet points --></section>
        <section id="cross-entity"><!-- Cross-entity matrix --></section>
        <section id="states"><!-- State machines --></section>
        <section id="api"><!-- API reference --></section>
        <section id="errors"><!-- Error handling --></section>
    </div>
    <script><!-- Mermaid initialization --></script>
</body>
</html>
```

### CSS Requirements
- Dark theme (bg: #0a0a1a, cards: #1a1a3a)
- Compact sizing:
  - Base font: 12px
  - Card padding: 10px
  - Section margins: 20px
  - Table cell padding: 5-6px
- Use CSS Grid for multi-column layouts
- Responsive breakpoints at 900px
- Distinct visual styling for:
  - SPECS (prominent, boxed)
  - Feature flags (colored border)
  - Edge case bullets (different markers)
  - Entity impacts (colored badges)

### Mermaid Configuration
```javascript
mermaid.initialize({
    theme: 'dark',
    themeVariables: {
        fontSize: '10px',
        primaryColor: '#6366f1',
        // ... dark theme colors
    },
    flowchart: { 
        useMaxWidth: true, 
        nodeSpacing: 25, 
        rankSpacing: 35 
    }
});
```

---

## QUALITY CHECKLIST
Before finalizing, verify:
□ SPECS section is comprehensive and self-contained
□ All feature flags documented with ON/OFF behavior
□ Main flow diagram includes ALL decision points
□ Every API function listed with side effects
□ Cross-entity matrix covers all events
□ Edge cases have recovery paths documented
□ Error codes and messages are accurate
□ Mermaid diagrams render correctly
□ Navigation links work
□ Layout is responsive

---

## CODE FILES TO ANALYZE
For [FLOW_NAME], analyze these files:
- Primary: `/functions/[module]/[relevant files]`
- Related: `/functions/utils/`, `/functions/session/`
- Constants: `/functions/[module]/[constants].js`
- Look for: validation logic, error handling, cross-module calls

---

## OUTPUT
Create a single HTML file: `[FLOW_NAME]_SYSTEM.html`
Save to: `/backend/src-plattr/warp/`
Open in browser after creation.
```

## PROMPT END

---

# FLOW-SPECIFIC PROMPTS

## For CART & CHECKOUT Flow:
Replace `[FLOW_NAME]` with: **Cart & Checkout**

Additional focus areas:
- addItemToCart validation (mandatory variants, stock checks)
- Cart item identification (identical config detection)
- Price calculation (variants, addons, respectParentDiscount)
- Checkout validation (re-validate stock, prices, session)
- Order creation vs appending to existing order
- Cart clearing after checkout
- Transaction safety (Firestore transactions)

Files to analyze:
- `/functions/cart/addItemToCart.js`
- `/functions/cart/checkoutCart.js`
- `/functions/cart/getCart.js`
- `/functions/orders/createOrUpdateOrder.js`
- `/functions/orders/orderConstants.js`

---

## For MENU Flow:
Replace `[FLOW_NAME]` with: **Menu Management**

Additional focus areas:
- Menu hierarchy (categories → items → variants → addons)
- Stock/availability filtering
- Price structures (basePrice, discount, finalPrice)
- Variant requirements (mandatory vs optional)
- Addon association (itemsAssociatedWith)
- CRUD operations (add, update, delete, availability toggle)

Files to analyze:
- `/functions/menu/indexMenu.js`
- `/functions/menu/fetchMenu.js`
- Mock data structure for schema reference

---

## For ORDER TRACKING Flow:
Replace `[FLOW_NAME]` with: **Order Lifecycle**

Additional focus areas:
- Order status transitions (PENDING → IN_PROGRESS → COMPLETED)
- Cart status within orders (PENDING → ACCEPTED → PREPARING → READY → SERVED)
- Item-level status tracking
- Server/kitchen interactions
- Real-time updates (Firestore listeners)
- Payment status integration
- Order modification (cancel, return)

Files to analyze:
- `/functions/orders/indexOrders.js`
- `/functions/orders/orderConstants.js`
- `/functions/orders/updateOrderStatus.js`

---

## For SERVER (Waiter) Flow:
Replace `[FLOW_NAME]` with: **Server Operations**

Additional focus areas:
- Server CRUD operations
- Table assignment/unassignment
- OTP generation for tables
- Order visibility and management
- FCM notifications
- Authentication (server_auth)

Files to analyze:
- `/functions/server/serverIndex.js`
- `/functions/server/server_auth.js`
- `/functions/table/table.js` (for OTP generation)

---

# ADDITIONAL POINTERS TO INCLUDE

When creating any flow documentation, also consider these often-missed aspects:

## Technical Nuances
1. **Transaction Safety**: Which operations use Firestore transactions? Why?
2. **Idempotency**: Can operations be safely retried?
3. **Race Conditions**: What concurrent scenarios are handled?
4. **Data Consistency**: How is consistency maintained across entities?

## User Experience Nuances
1. **Loading States**: What does the user see during API calls?
2. **Optimistic Updates**: Any client-side optimism before server confirms?
3. **Error Recovery**: Can the user retry? Auto-retry logic?
4. **Offline Behavior**: What happens with no connectivity?

## Security Nuances
1. **Auth Requirements**: Which endpoints require auth?
2. **Data Validation**: Client vs server-side validation
3. **Rate Limiting**: Any protection against abuse?
4. **Sensitive Data**: What data is never returned to client?

## Performance Nuances
1. **Query Efficiency**: Any Firestore composite indexes needed?
2. **Batch Operations**: Are batch writes used?
3. **Caching**: What data is cached? For how long?
4. **Lazy Loading**: What data is fetched on-demand?

## Integration Points
1. **Notifications**: When are push notifications triggered?
2. **Analytics**: Any event logging?
3. **External Services**: Any third-party integrations?

---

# SPECS FORMAT EXAMPLE

Here's an example of a well-structured SPECS section for Cart flow:

```
## 📋 SPECS: Cart & Checkout System

### Core Flow
SPEC-001: Cart is keyed by tableId under restaurants/{rid}/carts/{tableId}
SPEC-002: Adding item requires: restaurantId, tableId, menuItemId, quantity
SPEC-003: Variants/addons are optional but mandatory variants must be provided
SPEC-004: Identical item configs (same menuItemId + variants + addons) increase quantity
SPEC-005: Price calculated as: (itemFinal + variantFinal + addonFinal) × quantity

### Data Structure
SPEC-010: Cart item has unique cartItemId (auto-incremented)
SPEC-011: selectedVariantsDetails stores full variant info, not just IDs
SPEC-012: priceInfo includes baseAmount, discountAmount, finalAmount per item
SPEC-013: Cart totals stored in cart.priceInfo for quick access

### Feature Flags
SPEC-020: isMultipleVariantOrAddonSupported controls item consolidation
SPEC-021: When OFF, each addItemToCart creates new entry even if identical

### Validation
SPEC-030: Stock checked at add time AND at checkout time (double validation)
SPEC-031: Mandatory variants validated before adding to cart
SPEC-032: Session validated if sessionId provided (optional at add, required at checkout)
SPEC-033: Price consistency validated at checkout (menu prices may have changed)

### Error Cases
SPEC-040: OUT_OF_STOCK (410) - Item no longer available
SPEC-041: VARIANT_REQUIRED (400) - Mandatory variant not selected
SPEC-042: SESSION_INVALID (401) - Session expired or not found
SPEC-043: CART_EMPTY (400) - Checkout attempted with empty cart

### Cross-Entity Effects
SPEC-050: Checkout creates/updates order in orders subcollection
SPEC-051: Checkout clears cart after successful order creation
SPEC-052: Order links to session for tracking
SPEC-053: Server gets notification on new order

### Edge Cases
SPEC-060: Item removed from menu after adding to cart - flagged at checkout
SPEC-061: Price changed after adding to cart - recalculated at checkout
SPEC-062: Multiple users adding same item concurrently - handled via transaction
SPEC-063: Checkout during session expiry - fails with SESSION_INVALID
```

This format makes the SPECS scannable, searchable, and referenceable.

---

Save this prompt file and use it whenever you need to generate documentation for a new flow!
