# Proposed diff to CRITICAL_EXISTING_PIECES.md (BL sign-off, 2026-09-15) — not applied

Shaurya signed the BL Review section: CGST and SGST are rounded independently by default (`tax.partRounding = independent`), and the bill discount is apportioned by net price share, not by taxable value (taxable of an inclusive line depends on the discount; circular). Two lines in section 4 "What must be true" say otherwise.

```diff
-- Bill-level discounts are apportioned onto lines in proportion to taxable value, *before* tax
-  is computed, and the apportioned share is stored on the line.
+- Bill-level discounts are apportioned onto lines in proportion to net price (list − offer −
+  line discount), *before* tax is computed, leftover minor unit on the last line, and the
+  apportioned share is stored on the line.
-- Tax components are computed from the summed rate, then split back by share, with the
-  residual paisa landed on the last component. CGST + SGST must equal the single-rate figure
-  by construction.
+- Tax parts are computed per component. Default `tax.partRounding: independent`: each part is
+  rounded half-up on its own, so CGST and SGST print equal (8.33 + 8.33 on ₹333) and may
+  exceed the single-rate figure by one minor unit. `residualLast` gives the single-rate figure
+  with the residual on the last part (8.32 + 8.33). A block is the sum of its lines, never a
+  second calculation.
```

Apply with: `git apply` is overkill; edit the two bullets by hand.
