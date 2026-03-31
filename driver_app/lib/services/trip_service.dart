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

  static Future<String> startTrip(String tripId, {
    required double openingKm,
    String? driverRemarks,
  }) async {
    final response = await ApiService.post(ApiConfig.startTrip(tripId), {
      'opening_km': openingKm,
      if (driverRemarks != null) 'driver_remarks': driverRemarks,
    });
    return response['duty_slip_id'] ?? '';
  }

  static Future<double> completeTrip(String tripId, {
    required double closingKm,
    required String passengerSignature,
    String? driverRemarks,
  }) async {
    final response = await ApiService.post(ApiConfig.completeTrip(tripId), {
      'closing_km': closingKm,
      'passenger_signature': passengerSignature,
      if (driverRemarks != null) 'driver_remarks': driverRemarks,
    });
    return response['total_km']?.toDouble() ?? 0.0;
  }
}
