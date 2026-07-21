import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../config/api_config.dart';
import 'api_service.dart';
import 'connectivity_service.dart';
import 'offline_queue_service.dart';

class LocationService {
  static StreamSubscription<Position>? _positionStream;
  static Timer? _updateTimer;
  static Position? _lastPosition;
  static bool _isTracking = false;

  static bool get isTracking => _isTracking;
  static Position? get lastPosition => _lastPosition;

  static Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  static Future<Position?> getCurrentPosition() async {
    try {
      final hasPermission = await checkPermission();
      if (!hasPermission) return null;

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      _lastPosition = position;
      return position;
    } catch (e) {
      print('Error getting current position: $e');
      return null;
    }
  }

  static Future<void> startTracking() async {
    if (_isTracking) return;

    final hasPermission = await checkPermission();
    if (!hasPermission) return;

    _isTracking = true;

    // Get initial position
    await getCurrentPosition();
    await _sendLocationUpdate();

    // Set up periodic updates every 30 seconds
    _updateTimer = Timer.periodic(
      Duration(seconds: ApiConfig.locationUpdateInterval),
      (_) => _sendLocationUpdate(),
    );

    // Also listen to significant location changes
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50, // Update if moved more than 50 meters
      ),
    ).listen((Position position) {
      _lastPosition = position;
    });
  }

  static Future<void> stopTracking() async {
    _isTracking = false;
    _updateTimer?.cancel();
    _updateTimer = null;
    await _positionStream?.cancel();
    _positionStream = null;
  }

  static Future<void> _sendLocationUpdate() async {
    if (_lastPosition == null) {
      await getCurrentPosition();
    }
    
    if (_lastPosition == null) return;

    final payload = {
      'latitude': _lastPosition!.latitude,
      'longitude': _lastPosition!.longitude,
      'accuracy': _lastPosition!.accuracy,
      'speed': _lastPosition!.speed,
      'heading': _lastPosition!.heading,
    };

    // If we're offline, queue the ping instead of dropping it. This makes the
    // driver's post-trip location history complete once we're back online.
    if (!ConnectivityService.instance.isOnline) {
      await OfflineQueueService.instance.enqueue(QueuedAction(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        type: QueuedActionType.locationPing,
        tripId: '-',
        payload: payload,
        createdAt: DateTime.now(),
      ));
      return;
    }

    try {
      await ApiService.post(ApiConfig.updateLocation, payload);
    } catch (e) {
      // Fallback: queue on any transient error
      try {
        await OfflineQueueService.instance.enqueue(QueuedAction(
          id: DateTime.now().microsecondsSinceEpoch.toString(),
          type: QueuedActionType.locationPing,
          tripId: '-',
          payload: payload,
          createdAt: DateTime.now(),
        ));
      } catch (_) {}
    }
  }

  static double calculateDistance(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    return Geolocator.distanceBetween(startLat, startLng, endLat, endLng);
  }
}
