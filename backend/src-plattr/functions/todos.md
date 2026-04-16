# TODOs for Cart Functions

- Implement functionality to clear the cart when an order is placed or when checkout is done.
- Low Priority: Fix Stock Check Race Condition in checkoutCart.js
- Ensure that carts are properly managed, including handling expiry and activation status.  
- Add offer model field (e.g., respectOnlyOneDiscount) to explicitly control single-discount behavior.
- Add automated hygiene checks on offer creation (e.g., validate discount bounds, invalid combinations, expiry rules).

Simple - have a constants file for collections names. would be easier in future


handle authentication in cloud functions
if (!context.auth) {
  throw new functions.https.HttpsError(
    "unauthenticated",
    "User must be authenticated to retrieve the cart."
  );
}
