#!/bin/bash
# Manual API Testing Script for Plattr Pro

BASE_URL="http://127.0.0.1:5002/rms-app-dd875/us-central1"

echo "Testing Plattr Pro Backend APIs"
echo "================================"

# Test 1: Table Validation
echo -e "\n1. Testing Table Validation API..."
curl -X POST "$BASE_URL/table-validateTableAndLocation" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "restaurantId": "rest001",
      "tableId": "table001",
      "userLocation": {
        "latitude": 40.7128,
        "longitude": -74.006,
        "accuracy": 10.0
      }
    }
  }' || echo "API not accessible - emulator may not be running"

# Test 2: OTP Validation
echo -e "\n2. Testing OTP Validation API..."
curl -X POST "$BASE_URL/table-validateOTP" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "restaurantId": "rest001",
      "tableId": "table001",
      "otp": "123456",
      "phoneNumber": "1234567890",
      "name": "Test Customer"
    }
  }' || echo "API not accessible - emulator may not be running"

# Test 3: Menu Fetch
echo -e "\n3. Testing Menu Fetch API..."
curl -X POST "$BASE_URL/menu-fetchMenu-fetchMenu" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "restaurantId": "rest001",
      "inStock": true
    }
  }' || echo "API not accessible - emulator may not be running"

# Test 4: Cart Add Item
echo -e "\n4. Testing Add Item to Cart API..."
curl -X POST "$BASE_URL/cart-addItemToCart" \
  -H "Content-Type: application/json" \
  -d '{
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
  }' || echo "API not accessible - emulator may not be running"

# Test 5: Get Cart
echo -e "\n5. Testing Get Cart API..."
curl -X POST "$BASE_URL/cart-getCart" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "tableId": "table001",
      "restaurantId": "rest001"
    }
  }' || echo "API not accessible - emulator may not be running"

echo -e "\nAPI Testing Complete!"




