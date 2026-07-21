import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'location_service.dart';

/// A captured on-device "location stamp" — GPS coordinates and a
/// human-readable address, together with the moment it was captured.
class LocationStamp {
  final double latitude;
  final double longitude;
  final String? address;
  final DateTime capturedAt;

  const LocationStamp({
    required this.latitude,
    required this.longitude,
    this.address,
    required this.capturedAt,
  });

  String get shortAddress => address ?? '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}';
}

class GeocodingService {
  /// Captures the current GPS position and reverse-geocodes it into a
  /// human-readable address. Returns null when permission is denied or
  /// the device cannot obtain a fix.
  static Future<LocationStamp?> captureCurrentStamp() async {
    Position? position = await LocationService.getCurrentPosition();
    // Fallback: if the tracker already has a last-known position, use it
    position ??= LocationService.lastPosition;
    if (position == null) return null;

    final address = await reverseGeocode(position.latitude, position.longitude);
    return LocationStamp(
      latitude: position.latitude,
      longitude: position.longitude,
      address: address,
      capturedAt: DateTime.now(),
    );
  }

  /// Reverse-geocodes [latitude]/[longitude] to a compact human-readable
  /// address. Returns null on failure (offline, no plugin support, etc.).
  static Future<String?> reverseGeocode(double latitude, double longitude) async {
    try {
      final placemarks = await placemarkFromCoordinates(latitude, longitude)
          .timeout(const Duration(seconds: 8));
      if (placemarks.isEmpty) return null;
      final p = placemarks.first;
      final parts = <String>[
        if ((p.name ?? '').isNotEmpty && p.name != p.street) p.name!,
        if ((p.street ?? '').isNotEmpty) p.street!,
        if ((p.subLocality ?? '').isNotEmpty) p.subLocality!,
        if ((p.locality ?? '').isNotEmpty) p.locality!,
        if ((p.administrativeArea ?? '').isNotEmpty) p.administrativeArea!,
        if ((p.postalCode ?? '').isNotEmpty) p.postalCode!,
        if ((p.country ?? '').isNotEmpty) p.country!,
      ];
      // De-duplicate consecutive parts
      final deduped = <String>[];
      for (final part in parts) {
        if (deduped.isEmpty || deduped.last != part) deduped.add(part);
      }
      final joined = deduped.join(', ');
      return joined.isEmpty ? null : joined;
    } catch (_) {
      return null;
    }
  }
}
