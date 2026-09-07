# TODOs for Cart Functions

- Low Priority: Fix Stock Check Race Condition in checkoutCart.js (stock check runs outside the checkout transaction)
- Ensure that carts are properly managed, including handling expiry and activation status.  
- Add offer model field (e.g., respectOnlyOneDiscount) to explicitly control single-discount behavior.
- Add automated hygiene checks on offer creation (e.g., validate discount bounds, invalid combinations, expiry rules).

Simple - have a constants file for collections names. would be easier in future
