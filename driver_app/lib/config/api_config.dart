class ApiConfig {
  // Backend URL - Update this before building for production
  // For development: Use your local or preview URL
  // For production: Update to your production domain
  // 
  // Build with custom URL: flutter build apk --dart-define=API_BASE_URL=https://your-domain.com/api
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.214.194.234:8001/api'
  );
  
  // API Endpoints
  static const String sendOtp = '/driver/auth/send-otp';
  static const String verifyOtp = '/driver/auth/verify-otp';
  static const String driverProfile = '/driver/auth/me';
  static const String driverTrips = '/driver/trips';
  static const String tripHistory = '/driver/trips/history';
  static const String updateLocation = '/driver/location';
  
  // Trip actions
  static String tripDetail(String tripId) => '/driver/trips/$tripId';
  static String acceptTrip(String tripId) => '/driver/trips/$tripId/accept';
  static String rejectTrip(String tripId) => '/driver/trips/$tripId/reject';
  static String startTrip(String tripId) => '/driver/trips/$tripId/start';
  static String completeTrip(String tripId) => '/driver/trips/$tripId/complete';
  static String uploadTripPhoto(String tripId) => '/driver/trips/$tripId/upload-photo';
  
  // Google Maps API Key (Placeholder)
  static const String googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
  
  // Location update interval (seconds)
  static const int locationUpdateInterval = 30;
}
