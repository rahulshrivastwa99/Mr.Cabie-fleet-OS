import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiConfig {
  static String _customBaseUrl = '';

  static Future<void> init() async {
    try {
      const storage = FlutterSecureStorage();
      _customBaseUrl = await storage.read(key: 'custom_api_base_url') ?? '';
    } catch (_) {
      // Handle error gracefully during early initialization
    }
  }

  static Future<void> setCustomBaseUrl(String url) async {
    _customBaseUrl = url;
    try {
      const storage = FlutterSecureStorage();
      if (url.isEmpty) {
        await storage.delete(key: 'custom_api_base_url');
      } else {
        await storage.write(key: 'custom_api_base_url', value: url);
      }
    } catch (_) {}
  }

  static String get baseUrl {
    if (_customBaseUrl.isNotEmpty) {
      return _customBaseUrl;
    }
    return const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://172.20.10.3:8001/api'
    );
  }
  
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
