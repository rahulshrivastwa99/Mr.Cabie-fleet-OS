import 'package:flutter/material.dart';
import '../models/driver.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isLoading = false;
  String? _error;
  bool _isOtpSent = false;
  String? _debugOtp; // For development only

  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOtpSent => _isOtpSent;
  bool get isLoggedIn => AuthService.isLoggedIn;
  Driver? get currentDriver => AuthService.currentDriver;
  String? get debugOtp => _debugOtp;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();
    
    try {
      await AuthService.init();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> sendOtp(String phone) async {
    _isLoading = true;
    _error = null;
    _isOtpSent = false;
    notifyListeners();

    try {
      final response = await AuthService.sendOtp(phone);
      _isOtpSent = true;
      _debugOtp = response['debug_otp']; // Remove in production
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyOtp(String phone, String otp) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final success = await AuthService.verifyOtp(phone, otp);
      if (success) {
        _isOtpSent = false;
        _debugOtp = null;
      }
      notifyListeners();
      return success;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await AuthService.logout();
    _isOtpSent = false;
    _debugOtp = null;
    notifyListeners();
  }

  void resetOtpState() {
    _isOtpSent = false;
    _debugOtp = null;
    _error = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
