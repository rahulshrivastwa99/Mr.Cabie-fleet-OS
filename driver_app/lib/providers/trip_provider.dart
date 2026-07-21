import 'dart:io';
import 'package:flutter/material.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import '../services/location_service.dart';

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

    try {
      await TripService.startTrip(
        tripId,
        openingKm: openingKm,
        driverRemarks: remarks,
        latitude: latitude,
        longitude: longitude,
        address: address,
      );

      // Upload start photo (if provided) — non-fatal if it fails
      if (photo != null) {
        try {
          await TripService.uploadTripPhoto(tripId, photo, photoType: 'start');
        } catch (e) {
          debugPrint('Start photo upload failed: $e');
        }
      }
      
      // Start location tracking
      await LocationService.startTracking();
      
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

    try {
      // Upload the completion photo BEFORE the completion call, so the
      // duty slip stores a photo URL from the get-go. Failures are non-fatal.
      if (photo != null) {
        try {
          await TripService.uploadTripPhoto(tripId, photo, photoType: 'end');
        } catch (e) {
          debugPrint('End photo upload failed: $e');
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
