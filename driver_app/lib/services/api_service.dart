import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

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

  static Future<Map<String, dynamic>> get(String endpoint) async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}$endpoint'),
      headers: _headers,
    );
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}$endpoint'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> patch(String endpoint, [Map<String, dynamic>? body]) async {
    final response = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}$endpoint'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
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

  @override
  String toString() => message;
}
