import 'dart:io';
import 'package:flutter/material.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import '../services/location_service.dart';
import '../services/connectivity_service.dart';
import '../services/offline_queue_service.dart';
import '../services/api_service.dart';

class TripProvider extends ChangeNotifier {
  List<Trip> _activeTrips = [];
  List<Trip> _tripHistory = [];
  Trip? _currentTrip;
  bool _isLoading = false;
  String? _error;

  List<Trip> get activeTrips => _activeTrips;
  List<Trip> get tripHistory => _tripHistory;
  Trip? get currentTrip => _currentTrip;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Trip? get activeInProgressTrip {
    try {
      return _activeTrips.firstWhere((t) => t.status == 'STARTED');
    } catch (e) {
      return null;
    }
  }

  int get pendingTripsCount => _activeTrips.where((t) => t.status == 'ASSIGNED').length;
  int get acceptedTripsCount => _activeTrips.where((t) => t.status == 'ACCEPTED').length;

  Future<void> loadActiveTrips() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _activeTrips = await TripService.getActiveTrips();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadTripHistory() async {
    _isLoading = true;
    notifyListeners();

    try {
      _tripHistory = await TripService.getTripHistory();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Trip?> loadTripDetail(String tripId) async {
    _isLoading = true;
    notifyListeners();

    try {
      _currentTrip = await TripService.getTripDetail(tripId);
      notifyListeners();
      return _currentTrip;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> acceptTrip(String tripId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await TripService.acceptTrip(tripId);
      await loadActiveTrips();
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

  Future<bool> rejectTrip(String tripId, {String? reason}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await TripService.rejectTrip(tripId, reason: reason);
      await loadActiveTrips();
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

  Future<bool> startTrip(
    String tripId,
    double openingKm, {
    String? remarks,
    double? latitude,
    double? longitude,
    String? address,
    File? photo,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final startPayload = {
      'opening_km': openingKm,
      if (remarks != null) 'driver_remarks': remarks,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (address != null) 'address': address,
    };

    // Offline-first: if we're offline, queue the start and photo and return
    // success so the driver can keep working. The queue will replay when back.
    if (!ConnectivityService.instance.isOnline) {
      await OfflineQueueService.instance.enqueue(QueuedAction(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        type: QueuedActionType.startTrip,
        tripId: tripId,
        payload: startPayload,
        createdAt: DateTime.now(),
      ));
      if (photo != null) {
        await OfflineQueueService.instance.enqueue(QueuedAction(
          id: '${DateTime.now().microsecondsSinceEpoch}_photo',
          type: QueuedActionType.uploadPhoto,
          tripId: tripId,
          payload: {'photo_path': photo.path, 'photo_type': 'start'},
          createdAt: DateTime.now(),
        ));
      }
      await LocationService.startTracking();
      _isLoading = false;
      notifyListeners();
      return true;
    }

    try {
      await TripService.startTrip(
        tripId,
        openingKm: openingKm,
        driverRemarks: remarks,
        latitude: latitude,
        longitude: longitude,
        address: address,
      );

      // Upload start photo (if provided) — non-fatal if it fails (already
      // retries 3× internally, then we queue for later).
      if (photo != null) {
        try {
          await TripService.uploadTripPhoto(tripId, photo, photoType: 'start');
        } catch (e) {
          debugPrint('Start photo upload failed after retries; queuing: $e');
          await OfflineQueueService.instance.enqueue(QueuedAction(
            id: '${DateTime.now().microsecondsSinceEpoch}_photo',
            type: QueuedActionType.uploadPhoto,
            tripId: tripId,
            payload: {'photo_path': photo.path, 'photo_type': 'start'},
            createdAt: DateTime.now(),
          ));
        }
      }
      
      // Start location tracking
      await LocationService.startTracking();
      
      await loadActiveTrips();
      return true;
    } on ApiException catch (e) {
      _error = e.toString();
      notifyListeners();
      if (e.isUnauthorized) return false;
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<double?> completeTrip(
    String tripId,
    double closingKm,
    String signature, {
    required String travellerName,
    String? remarks,
    double? latitude,
    double? longitude,
    String? address,
    File? photo,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final completePayload = {
      'closing_km': closingKm,
      'passenger_signature': signature,
      'traveller_name': travellerName,
      if (remarks != null) 'driver_remarks': remarks,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (address != null) 'address': address,
    };

    // Offline-first: queue completion and photo, then optimistically report
    // total_km based on client-side math so the UI can proceed.
    if (!ConnectivityService.instance.isOnline) {
      if (photo != null) {
        await OfflineQueueService.instance.enqueue(QueuedAction(
          id: '${DateTime.now().microsecondsSinceEpoch}_photo',
          type: QueuedActionType.uploadPhoto,
          tripId: tripId,
          payload: {'photo_path': photo.path, 'photo_type': 'end'},
          createdAt: DateTime.now(),
        ));
      }
      await OfflineQueueService.instance.enqueue(QueuedAction(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        type: QueuedActionType.completeTrip,
        tripId: tripId,
        payload: completePayload,
        createdAt: DateTime.now(),
      ));
      await LocationService.stopTracking();
      _isLoading = false;
      notifyListeners();
      // Approximate total_km from what we know locally (opening_km from the
      // duty slip via activeTrips). Fall back to 0 if not available.
      double optimisticTotal = 0;
      try {
        final trip = _activeTrips.firstWhere((t) => t.id == tripId);
        final opening = trip.dutySlip?.openingKm ?? 0;
        optimisticTotal = (closingKm - opening).clamp(0, double.infinity);
      } catch (_) {}
      return optimisticTotal;
    }

    try {
      // Upload the completion photo BEFORE the completion call
      if (photo != null) {
        try {
          await TripService.uploadTripPhoto(tripId, photo, photoType: 'end');
        } catch (e) {
          debugPrint('End photo upload failed after retries; queuing: $e');
          await OfflineQueueService.instance.enqueue(QueuedAction(
            id: '${DateTime.now().microsecondsSinceEpoch}_photo',
            type: QueuedActionType.uploadPhoto,
            tripId: tripId,
            payload: {'photo_path': photo.path, 'photo_type': 'end'},
            createdAt: DateTime.now(),
          ));
        }
      }

      final totalKm = await TripService.completeTrip(
        tripId,
        closingKm: closingKm,
        passengerSignature: signature,
        travellerName: travellerName,
        driverRemarks: remarks,
        latitude: latitude,
        longitude: longitude,
        address: address,
      );
      
      // Stop location tracking
      await LocationService.stopTracking();
      
      await loadActiveTrips();
      return totalKm;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void setCurrentTrip(Trip? trip) {
    _currentTrip = trip;
    notifyListeners();
  }
}
