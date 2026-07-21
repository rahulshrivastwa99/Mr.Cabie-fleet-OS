import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/trip.dart';
import 'api_service.dart';

class TripService {
  static Future<List<Trip>> getActiveTrips() async {
    final response = await ApiService.get(ApiConfig.driverTrips);
    final List data = response['data'] ?? [];
    return data.map((json) => Trip.fromJson(json)).toList();
  }

  static Future<List<Trip>> getTripHistory({int limit = 20, int offset = 0}) async {
    final response = await ApiService.get('${ApiConfig.tripHistory}?limit=$limit&offset=$offset');
    final List data = response['data'] ?? [];
    return data.map((json) => Trip.fromJson(json)).toList();
  }

  static Future<Trip> getTripDetail(String tripId) async {
    final response = await ApiService.get(ApiConfig.tripDetail(tripId));
    // Backend returns { trip: {...}, duty_slip: {...} }
    if (response['trip'] is Map) {
      final tripMap = Map<String, dynamic>.from(response['trip']);
      if (response['duty_slip'] is Map) {
        tripMap['duty_slip'] = response['duty_slip'];
      }
      return Trip.fromJson(tripMap);
    }
    return Trip.fromJson(response);
  }

  static Future<void> acceptTrip(String tripId) async {
    await ApiService.patch(ApiConfig.acceptTrip(tripId));
  }

  static Future<void> rejectTrip(String tripId, {String? reason}) async {
    await ApiService.patch(ApiConfig.rejectTrip(tripId), {
      if (reason != null) 'reason': reason,
    });
  }

  static Future<String> startTrip(
    String tripId, {
    required double openingKm,
    String? driverRemarks,
    double? latitude,
    double? longitude,
    String? address,
  }) async {
    final response = await ApiService.post(ApiConfig.startTrip(tripId), {
      'opening_km': openingKm,
      if (driverRemarks != null) 'driver_remarks': driverRemarks,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (address != null) 'address': address,
    });
    return response['duty_slip_id'] ?? '';
  }

  static Future<double> completeTrip(
    String tripId, {
    required double closingKm,
    required String passengerSignature,
    required String travellerName,
    String? driverRemarks,
    double? latitude,
    double? longitude,
    String? address,
  }) async {
    final response = await ApiService.post(ApiConfig.completeTrip(tripId), {
      'closing_km': closingKm,
      'passenger_signature': passengerSignature,
      'traveller_name': travellerName,
      if (driverRemarks != null) 'driver_remarks': driverRemarks,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (address != null) 'address': address,
    });
    return (response['total_km'] as num?)?.toDouble() ?? 0.0;
  }

  /// Uploads a photo captured on trip start or completion.
  /// [photoType] must be "start" or "end".
  /// Retries up to 3 times on network failure before giving up.
  /// Returns the server-side photo URL.
  static Future<String> uploadTripPhoto(
    String tripId,
    File photoFile, {
    required String photoType,
    int maxAttempts = 3,
  }) async {
    Object? lastError;
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await _uploadTripPhotoOnce(tripId, photoFile, photoType: photoType);
      } on ApiException catch (e) {
        lastError = e;
        // Don't retry client errors (400/401/403/413) — only network/5xx.
        if (e.statusCode >= 400 && e.statusCode < 500 && e.statusCode != 0) {
          rethrow;
        }
        if (attempt < maxAttempts) {
          await Future.delayed(Duration(milliseconds: 600 * attempt));
        }
      } catch (e) {
        lastError = e;
        if (attempt < maxAttempts) {
          await Future.delayed(Duration(milliseconds: 600 * attempt));
        }
      }
    }
    throw ApiException(
      'Photo upload failed after $maxAttempts attempts: $lastError',
      0,
    );
  }

  static Future<String> _uploadTripPhotoOnce(
    String tripId,
    File photoFile, {
    required String photoType,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.uploadTripPhoto(tripId)}');
    final request = http.MultipartRequest('POST', uri);

    // Attach JWT
    final token = ApiService.token;
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    // Form field
    request.fields['photo_type'] = photoType;

    // File
    request.files.add(await http.MultipartFile.fromPath(
      'photo',
      photoFile.path,
    ));

    final streamed = await request.send().timeout(const Duration(seconds: 45));
    final response = await http.Response.fromStream(streamed);

    Map<String, dynamic> body;
    try {
      final decoded = jsonDecode(response.body);
      body = decoded is Map<String, dynamic> ? decoded : {'detail': response.body};
    } catch (_) {
      body = {'detail': 'Server error (${response.statusCode})'};
    }

    if (response.statusCode == 401 || response.statusCode == 403) {
      // Same session-expired treatment as normal API calls
      await ApiService.clearToken();
      AuthEvents.emit(AuthEvent.unauthorized);
      throw ApiException(
        (body['detail'] ?? 'Session expired. Please log in again.').toString(),
        response.statusCode,
      );
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return (body['photo_url'] as String?) ?? '';
    }
    throw ApiException(
      (body['detail'] ?? 'Failed to upload photo').toString(),
      response.statusCode,
    );
  }
}
