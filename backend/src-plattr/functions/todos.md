# TODOs for Cart Functions

- Implement functionality to clear the cart when an order is placed or when checkout is done.
- Ensure that carts are properly managed, including handling expiry and activation status.  

Simple - have a constants file for collections names. would be easier in future


handle authentication in cloud functions
if (!context.auth) {
  throw new functions.https.HttpsError(
    "unauthenticated",
    "User must be authenticated to retrieve the cart."
  );
}
