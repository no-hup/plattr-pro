# Cart API Curl Commands

## Add Item to Cart

curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-addItemToCart' \
--header 'Content-Type: application/json' \
--data '{"data":
{
"tableId": "table001",
"restaurantId": "rest001",
"menuItemId": "item001",
"quantity": 1,
"selectedVariants": {
"variant_burger_size": "burger_size_regular"
},
"selectedAddons": ["addon_burger_fries"]
}
}'



## Remove Item from Cart


curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-removeItemFromCart' \
--header 'Content-Type: application/json' \
--data '{
"data": {
"tableId": "table001",
"restaurantId": "rest001",
"menuItemId": "item001",
"quantity": 1,
"selectedVariants": {
"variant_burger_size": "burger_size_regular"
},
"selectedAddons": ["addon_burger_fries"]
}
}'


## Get Cart

curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-getCart' \
--header 'Content-Type: application/json' \
--data '{
    "data": {
    "tableId": "table001",
    "restaurantId": "rest001"
  }
}'