import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

/// A tiny event bus that fires whenever the JWT is rejected by the backend.
/// The root [App] listens for this and safely redirects the driver to the
/// login screen without leaving orphaned state behind.
class AuthEvents {
  AuthEvents._();
  static final _controller = StreamController<AuthEvent>.broadcast();
  static Stream<AuthEvent> get stream => _controller.stream;
  static void emit(AuthEvent e) => _controller.add(e);
}

enum AuthEvent { unauthorized }

class ApiService {
  static const _storage = FlutterSecureStorage();
  static String? _token;

  static Future<void> init() async {
    _token = await _storage.read(key: 'driver_token');
  }

  static Future<void> setToken(String token) async {
    _token = token;
    await _storage.write(key: 'driver_token', value: token);
  }

  static Future<void> clearToken() async {
    _token = null;
    await _storage.delete(key: 'driver_token');
  }

  static bool get isAuthenticated => _token != null;

  static String? get token => _token;

  static String get baseUrl => ApiConfig.baseUrl;

  static Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  /// Wraps an HTTP call with a short retry loop for transient network
  /// failures (SocketException, TimeoutException). Non-network failures
  /// bubble up immediately.
  static Future<http.Response> _sendWithRetry(
    Future<http.Response> Function() send, {
    int maxAttempts = 2,
  }) async {
    Object? lastError;
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await send().timeout(const Duration(seconds: 20));
      } catch (e) {
        lastError = e;
        if (attempt < maxAttempts) {
          await Future.delayed(Duration(milliseconds: 400 * attempt));
        }
      }
    }
    throw ApiException('Network error: $lastError', 0);
  }

  static Future<Map<String, dynamic>> get(String endpoint) async {
    final response = await _sendWithRetry(() => http.get(
          Uri.parse('${ApiConfig.baseUrl}$endpoint'),
          headers: _headers,
        ));
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> post(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    final response = await _sendWithRetry(() => http.post(
          Uri.parse('${ApiConfig.baseUrl}$endpoint'),
          headers: _headers,
          body: jsonEncode(body),
        ));
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> patch(
    String endpoint, [
    Map<String, dynamic>? body,
  ]) async {
    final response = await _sendWithRetry(() => http.patch(
          Uri.parse('${ApiConfig.baseUrl}$endpoint'),
          headers: _headers,
          body: body != null ? jsonEncode(body) : null,
        ));
    return _handleResponse(response);
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    Map<String, dynamic> body;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        body = decoded;
      } else if (decoded is List) {
        body = {'data': decoded};
      } else {
        body = {'detail': response.body};
      }
    } catch (_) {
      if (response.statusCode == 404) {
        body = {'detail': 'Server error (404): Endpoint not found. Check backend server URL.'};
      } else {
        body = {'detail': 'Server error (${response.statusCode}): Could not process server response.'};
      }
    }

    // Founder-requested security guardrail: gracefully surface expired /
    // rejected tokens so the app can force-logout and redirect to login.
    if (response.statusCode == 401 || response.statusCode == 403) {
      // Clear stored token so subsequent app boots go straight to login.
      _token = null;
      _storage.delete(key: 'driver_token').catchError((_) {});
      AuthEvents.emit(AuthEvent.unauthorized);
      throw ApiException(
        (body['detail'] ?? 'Your session has expired. Please log in again.').toString(),
        response.statusCode,
      );
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {...body, 'success': true};
    } else {
      final detail = body['detail'] ?? 'An error occurred (${response.statusCode})';
      throw ApiException(detail.toString(), response.statusCode);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, this.statusCode);

  bool get isUnauthorized => statusCode == 401 || statusCode == 403;
  bool get isNetworkError => statusCode == 0;

  @override
  String toString() => message;
}
