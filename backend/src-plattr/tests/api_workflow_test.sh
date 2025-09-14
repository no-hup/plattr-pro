#!/bin/bash
# API Test Workflow for Customer-Facing Endpoints
# This file contains curl commands to test the complete customer journey
# Reference: Use mock_data.json as the starting point for our mock store DB

# Set base URL for your API
BASE_URL="http://localhost:5001/your-project-id/us-central1"

# Color codes for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print section headers
print_header() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# Helper function to save response to a variable and print it
execute_curl() {
  echo -e "${GREEN}REQUEST:${NC} $1"
  response=$(eval $1)
  echo -e "${GREEN}RESPONSE:${NC}"
  echo $response | jq '.'
  echo ""
}

# Start testing workflow
print_header "STARTING API TEST WORKFLOW"
echo "This test script will walk through the complete customer journey"
echo "Make sure your Firebase functions are running locally before proceeding"
echo "Reference data is in mock_data.json"

# TODO: Add specific API test commands below
# The commands will follow the customer journey:
# 1. Get menu items
# 2. Create cart
# 3. Add items to cart
# 4. Get cart
# 5. Checkout cart
# 6. Get order
# 7. Get orders by table

print_header "TEST COMPLETED" 