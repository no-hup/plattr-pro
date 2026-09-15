### 1. Money Correctness & Rounding

**TC1.1: Plain Bill (Exclusive Tax)**
*   **Input**:
    *   Line 1: `qty`: 1, `components[0]`: {`unitListPrice`: 50000, `taxBlockId`: "food"}
    *   Line 2: `qty`: 1, `components[0]`: {`unitListPrice`: 8000, `taxBlockId`: "food"}
    *   Config: food block {`mode`: "exclusive", `parts`: [{`rateBps`: 250}, {`rateBps`: 250}]}
    *   `billing.roundTo`: 100
*   **Output**:
    *   Food block: `taxable`: 58000, `parts`: [1450, 1450], `tax`: 2900, `total`: 60900
    *   Bill: `subtotal`: 58000, `taxTotal`: 2900, `roundOff`: 0, `payable`: 60900

**TC1.2: Discount Apportionment (Mixed Blocks)**
*   **Input**:
    *   Line 1 (Food): `qty`: 1, `components[0]`: {`unitListPrice`: 120000, `taxBlockId`: "food"}
    *   Line 2 (Liquor): `qty`: 1, `components[0]`: {`unitListPrice`: 80000, `taxBlockId`: "liquor"}
    *   Config: food {`mode`: "exclusive", `parts`: [{`rateBps`: 500}]}, liquor {`mode`: "inclusive", `parts`: []}
    *   Bill `discount`: {`amount`: 20000}
*   **Output**:
    *   Line 1 `billDiscount`: 12000
    *   Line 2 `billDiscount`: 8000
    *   Food block: `taxable`: 108000, `parts`: [5400], `tax`: 5400, `total`: 113400
    *   Liquor block: `taxable`: 72000, `parts`: [], `tax`: 0, `total`: 72000
    *   Bill: `subtotal`: 180000, `taxTotal`: 5400, `payable`: 185400

**TC1.3: Minor Unit Rounding on Apportionment (Leftover)**
*   **Input**:
    *   Line 1: `qty`: 1, `components[0]`: {`unitListPrice`: 3333}
    *   Line 2: `qty`: 1, `components[0]`: {`unitListPrice`: 3333}
    *   Line 3: `qty`: 1, `components[0]`: {`unitListPrice`: 3334}
    *   Bill `discount`: {`amount`: 1000}
*   **Output**:
    *   Line 1 `billDiscount`: 333
    *   Line 2 `billDiscount`: 333
    *   Line 3 `billDiscount`: 334

**TC1.4: Inclusive Tax Decomposition**
*   **Input**:
    *   Line 1: `qty`: 1, `components[0]`: {`unitListPrice`: 49900, `taxBlockId`: "liquor"}
    *   Config: liquor block {`mode`: "inclusive", `parts`: [{`rateBps`: 550}]}
*   **Output**:
    *   Liquor block: `taxable`: 47298, `parts`: [2602], `tax`: 2602, `total`: 49900
    *   Bill: `subtotal`: 47298, `taxTotal`: 2602, `payable`: 49900

**TC1.5: Half-Paisa Independent Rounding**
*   **Input**:
    *   Line 1: `qty`: 1, `components[0]`: {`unitListPrice`: 33300, `taxBlockId`: "food"}
    *   Config: food block {`mode`: "exclusive", `parts`: [{`rateBps`: 250}, {`rateBps`: 250}]}, `tax.partRounding`: "independent"
*   **Output**:
    *   Food block: `taxable`: 33300, `parts`: [833, 833], `tax`: 1666, `total`: 34966

**TC1.6: Payable Round-Off**
*   **Input 1**: Bill pre-rounding total 60940, `billing.roundTo`: 100
*   **Output 1**: `payable`: 60900, `roundOff`: -40
*   **Input 2**: Bill pre-rounding total 60950, `billing.roundTo`: 100
*   **Output 2**: `payable`: 61000, `roundOff`: 50

**TC1.7: Bill-Level Charge Base Net & Tax**
*   **Input**:
    *   Line 1: `qty`: 1, `components[0]`: {`unitListPrice`: 120000, `taxBlockId`: "food"}
    *   Line 2: `qty`: 1, `components[0]`: {`unitListPrice`: 80000, `taxBlockId`: "liquor"}
    *   Config: `billing.charges`: [{`type`: "service", `pctBps`: 1000, `taxBlockId`: "food"}]
*   **Output**:
    *   Charge row: `base`: 120000, `amount`: 12000
    *   Food block: `taxable`: 132000, `tax`: 6600 (assuming 5% exclusive), `total`: 138600
    *   Liquor block: `taxable`: 80000, `tax`: 0, `total`: 80000
    *   Bill: `payable`: 218600

**TC1.8: Multi-Component Line Tax Separation**
*   **Input**:
    *   Line 1: `qty`: 1, `components`: [{`unitListPrice`: 30000, `taxBlockId`: "food"}, {`unitListPrice`: 10000, `taxBlockId`: "liquor"}]
    *   Config: food (excl 5%), liquor (incl 0%)
*   **Output**:
    *   Line 1 `listPrice`: 40000
    *   Food block: `taxable`: 30000, `tax`: 1500
    *   Liquor block: `taxable`: 10000, `tax`: 0

### 2. Edge Cases

**TC2.1: Free Item / 100% Comp**
*   **Input**:
    *   Line 1: `qty`: 1, `components[0]`: {`unitListPrice`: 50000}, `offer`: {`amount`: 50000}
*   **Output**:
    *   Line 1: `listPrice`: 50000, `taxable`: 0
    *   Bill: `subtotal`: 0, `taxTotal`: 0, `payable`: 0 (Issue generates standard number).

**TC2.2: Below-Zero Discount Refusal**
*   **Input**:
    *   Line 1: `components[0]`: {`unitListPrice`: 50000}, `offer`: {`amount`: 10000}, `discount`: {`amount`: 5000} (Net: 35000)
    *   Bill `discount` attempt: {`amount`: 40000}
*   **Output**:
    *   Failed-precondition error (component goes below zero).

**TC2.3: Voided Line Exclusion**
*   **Input**:
    *   Line 1: `components[0]`: {`unitListPrice`: 45000}, `countsTowardTotal`: false
*   **Output**:
    *   Bill: `subtotal`: 0, `taxTotal`: 0, `payable`: 0 (line frozen in `bill.lines` but ignored by blocks).

**TC2.4: Composition Scheme**
*   **Input**:
    *   Line 1: `components[0]`: {`unitListPrice`: 50000, `taxBlockId`: "food"}
    *   Config: food block {`collect`: false, `mode`: "exclusive", `parts`: [{`rateBps`: 250}, {`rateBps`: 250}]}
*   **Output**:
    *   Food block: `taxable`: 50000, `parts`: [], `tax`: 0, `total`: 50000
    *   Bill: `payable`: 50000

**TC2.5: Missing Tax Block**
*   **Input**: Line 1: `components[0]`: {`unitListPrice`: 50000, `taxBlockId`: null}
*   **Output**: Issue refused with dish name.

### 3. Concurrency

**TC3.1: Double Tap Issue**
*   **Input**:
    *   TX1: Issue(draft A, `v`: 1)
    *   TX2: Issue(draft A, `v`: 1) concurrent
*   **Output**:
    *   TX1: Success. `billId` assigned, counter incremented.
    *   TX2: Failed-precondition ("already issued").

**TC3.2: Line Edit Post-Issue**
*   **Input**: Line 1 has `billId`: "0417", Attempt to apply discount via ST.
*   **Output**: Failed-precondition ("bill already issued").

### 4. State Transitions

**TC4.1: Counter Issue Assignment**
*   **Input**: `counters/A_2026-27` `{next: 417}`, `invoice.series`: "A". Issue triggered.
*   **Output**: Bill gets `number`: "0417", `series`: "A", `fiscalYear`: "2026-27". Counter document updated to `{next: 418}` in the same transaction.

**TC4.2: Cancel Unpaid Bill**
*   **Input**: Bill 0417 (`status`: "issued", Lines `billId`: "0417"). Action: Cancel.
*   **Output**:
    *   Bill 0417: `status`: "cancelled".
    *   Lines: `billId` reverted to `null`.

**TC4.3: Credit Note Generation**
*   **Input**: Original Bill 0417 (`status`: "paid"). Line 1: `qty`: 3, `listPrice`: 24000, `tax`: 1200. Action: Credit Note for Line 1, `qty`: 1.
*   **Output**:
    *   New Document: `creditNoteOf`: {`billId`: "0417"}, `number`: "CN-0007" (read from CN counter).
    *   CN Line 1: `qty`: 1, `listPrice`: -8000, `tax`: -400, `total`: -8400.
    *   Original Bill 0417: `status` remains "paid", `creditNotes` array updated.

**TC4.4: Credit Note Exceeds Creditable Qty**
*   **Input**: Original Bill 0417 (`status`: "paid"). Line 1: `qty`: 3. Existing CN for `qty`: 2. Action: Credit Note for Line 1, `qty`: 2.
*   **Output**: Failed-precondition (qty ≤ remaining creditable quantity).

**TC4.5: Year End Crossover**
*   **Input**: Current time: 2027-04-01 00:00 (Asia/Kolkata), `invoice.fiscalYearStartMonth`: 4
*   **Output**: Bill issued with `fiscalYear`: "2027-28" utilizing counter `A_2027-28` starting at `{next: 1}`.

*(Note: <80% sure on how `leftover minor unit on the last part by position` is evaluated when applying multi-part taxes in edge cases like TC1.3/TC1.5—whether it targets the largest index or the literal last element in the array, though standard implies array `.pop()` equivalent index. Also <80% sure if the CN over-qty tracking (TC4.4) is resolved via a live query sum of past notes or a persisted field, based purely on the sheet's read-only copy spec.)*
