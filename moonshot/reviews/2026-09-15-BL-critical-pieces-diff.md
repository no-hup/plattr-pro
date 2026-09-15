# Proposed diff to CRITICAL_EXISTING_PIECES.md (BL sign-off, 2026-09-15) — not applied

Shaurya signed the BL Review section and then asked for the open tax calls to be taken rather than parked. Three things now differ from section 4 "What must be true":

1. CGST and SGST round independently (`tax.partRounding = independent`), so they print equal and may exceed the single-rate figure by one minor unit. They are levies under two Acts, shown separately under Rule 46(m) and reconciled per head; nothing requires them to add to a combined figure, and an unequal pair reads as a bug.
2. The bill discount is apportioned by net price share, not by taxable value. The taxable of an inclusive line depends on the discount, so apportioning by taxable is circular.
3. The apportioned share is a cumulative floor rather than a leftover dumped on the last line, so no line is more than one minor unit under its true share. ERPNext does the same by error diffusion (`taxes_and_totals.py:919-950`).

```diff
-- Bill-level discounts are apportioned onto lines in proportion to taxable value, *before* tax
-  is computed, and the apportioned share is stored on the line.
+- Bill-level discounts are apportioned onto lines in proportion to net price (list − offer −
+  line discount), *before* tax is computed, by cumulative floor so no line is more than one
+  minor unit under its share, and the apportioned share is stored on the line.
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
