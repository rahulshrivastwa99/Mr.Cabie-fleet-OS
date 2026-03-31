import '../config/api_config.dart';
import '../models/driver.dart';
import 'api_service.dart';

class AuthService {
  static Driver? _currentDriver;

  static Driver? get currentDriver => _currentDriver;
  static bool get isLoggedIn => _currentDriver != null && ApiService.isAuthenticated;

  static Future<void> init() async {
    await ApiService.init();
    if (ApiService.isAuthenticated) {
      try {
        await refreshProfile();
      } catch (e) {
        // Token might be invalid
        await logout();
      }
    }
  }

  static Future<Map<String, dynamic>> sendOtp(String phone) async {
    final response = await ApiService.post(ApiConfig.sendOtp, {
      'phone': phone,
    });
    return response;
  }

  static Future<bool> verifyOtp(String phone, String otp) async {
    final response = await ApiService.post(ApiConfig.verifyOtp, {
      'phone': phone,
      'otp': otp,
    });
    
    if (response['token'] != null) {
      await ApiService.setToken(response['token']);
      _currentDriver = Driver.fromJson(response['driver']);
      return true;
    }
    return false;
  }

  static Future<void> refreshProfile() async {
    final response = await ApiService.get(ApiConfig.driverProfile);
    _currentDriver = Driver.fromJson(response);
  }

  static Future<void> logout() async {
    await ApiService.clearToken();
    _currentDriver = null;
  }
}
