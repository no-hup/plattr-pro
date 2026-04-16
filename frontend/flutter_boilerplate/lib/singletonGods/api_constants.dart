// TODOshaurya dev add environment variable support

class ApiConfig {
  // Making class final instead of abstract since we just need constants
  const ApiConfig._(); // Private constructor to prevent instantiation

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:5002/rms-app-dd875/us-central1',
  );

  static const timeout = Duration(seconds: 15);
  static const validateTableEndpointDev = '/table-validateTableDev';
  static const validateTableEndpointProd = '/table-validateTableAndLocation';
  static const validateOtpEndpointProd = '/table-validateOTP';
  static const checkTableStatusEndpointProd = '/table-checkTableStatus';
  static const getTablesForRestaurantEndpointProd =
      '/table-getTablesForRestaurant';
  static const getTableDetailsEndpointProd = '/table-getTableDetails';
  static const assignTableToServerEndpointProd = '/table-assignTableToServer';
  static const unassignTableFromServerEndpointProd =
      '/table-unassignTableFromServer';
  static const generateTableOtpEndpointProd = '/table-generateTableOTP';
  static const updateTableStatusEndpointProd = '/table-updateTableStatus';
  static const menuFetch = '/menu-fetchMenu-fetchMenu';
  static const String addItemToCartEndpoint = '/cart-addItemToCart';
  static const String removeItemFromCartEndpoint = '/cart-removeItemFromCart';
  static const String fetchCartEndpoint = '/cart-getCart';
  static const String validateOtpEndpoint = '/table-validateOTP';
  static const String checkoutCartEndpoint = '/cart-checkoutCart';
  static const String orderGetCartEndpoint = '/order-getOrder';
  static const String listRestaurantsDevEndpoint = '/dev-listRestaurants';
  
  // Offers API endpoints
  static const String getApplicableOffersEndpoint = '/offers-getApplicableOffers';
  static const String applyOfferEndpoint = '/offers-applyOffer';
}

const errorMessages = {
  'network': 'Connection error. Please check your internet connection.',
  'timeout': 'Connection timeout. Please check your internet connection.',
  'server': 'Server returned an error',
  'validation': 'Invalid table',
  'connection_error': 'Failed to connect to server.',
  'timeout_error': 'Network request timed out.',
  'security_error': 'Security error occurred.',
  'bad_response': 'Received invalid response from server.',
  'unknown_error': 'An unexpected error occurred.',
  'checkout_error': 'An error occurred during checkout.',
  'auth_required': 'Authentication required to continue.',
};
