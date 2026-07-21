import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'trip_service.dart';
import 'api_service.dart';
import 'connectivity_service.dart';

/// Types of driver actions that can be queued when offline.
enum QueuedActionType {
  startTrip,
  completeTrip,
  uploadPhoto,
  locationPing,
}

class QueuedAction {
  final String id;
  final QueuedActionType type;
  final String tripId;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  int attempts;

  QueuedAction({
    required this.id,
    required this.type,
    required this.tripId,
    required this.payload,
    required this.createdAt,
    this.attempts = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'trip_id': tripId,
        'payload': payload,
        'created_at': createdAt.toIso8601String(),
        'attempts': attempts,
      };

  factory QueuedAction.fromJson(Map<String, dynamic> j) => QueuedAction(
        id: j['id'] as String,
        type: QueuedActionType.values.firstWhere(
          (e) => e.name == j['type'],
          orElse: () => QueuedActionType.locationPing,
        ),
        tripId: j['trip_id'] as String,
        payload: Map<String, dynamic>.from(j['payload'] as Map),
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ?? DateTime.now(),
        attempts: (j['attempts'] as int?) ?? 0,
      );
}

/// Persists driver actions that couldn't reach the backend and replays them
/// the moment the device is back online. This is what makes the driver app
/// resilient in poor-connectivity real-world conditions (parking lots,
/// tunnels, remote pick-up points).
class OfflineQueueService {
  OfflineQueueService._();
  static final OfflineQueueService instance = OfflineQueueService._();

  static const _storageKey = 'driver_offline_queue_v1';
  static const int _maxAttemptsBeforeGiveUp = 6;

  final List<QueuedAction> _queue = [];
  bool _flushing = false;
  StreamSubscription<bool>? _connSub;
  final StreamController<int> _sizeController = StreamController<int>.broadcast();

  Stream<int> get onSizeChange => _sizeController.stream;
  int get pendingCount => _queue.length;

  Future<void> init() async {
    await _load();
    _connSub?.cancel();
    _connSub = ConnectivityService.instance.onStatusChange.listen((online) {
      if (online) {
        // Fire-and-forget best-effort flush
        flush();
      }
    });
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    _queue.clear();
    if (raw == null || raw.isEmpty) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        for (final item in decoded) {
          if (item is Map<String, dynamic>) {
            _queue.add(QueuedAction.fromJson(item));
          }
        }
      }
    } catch (e) {
      debugPrint('OfflineQueue: failed to load queue: $e');
    }
    _sizeController.add(_queue.length);
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final list = _queue.map((a) => a.toJson()).toList();
    await prefs.setString(_storageKey, jsonEncode(list));
    _sizeController.add(_queue.length);
  }

  Future<void> enqueue(QueuedAction action) async {
    _queue.add(action);
    await _persist();
  }

  /// Attempts to send every queued action. If we're still offline, this is a
  /// no-op. Uses a lock so simultaneous callers don't stampede the backend.
  Future<void> flush() async {
    if (_flushing) return;
    if (!ConnectivityService.instance.isOnline) return;
    if (_queue.isEmpty) return;

    _flushing = true;
    try {
      // Copy so we can mutate while iterating
      final snapshot = List<QueuedAction>.from(_queue);
      for (final action in snapshot) {
        try {
          await _replay(action);
          _queue.removeWhere((a) => a.id == action.id);
          await _persist();
        } on ApiException catch (e) {
          action.attempts++;
          if (e.isUnauthorized || action.attempts >= _maxAttemptsBeforeGiveUp) {
            debugPrint('OfflineQueue: dropping action ${action.id} after ${action.attempts} attempts ($e)');
            _queue.removeWhere((a) => a.id == action.id);
          }
          await _persist();
          if (e.isNetworkError) break; // stop; still offline-ish
        } catch (e) {
          action.attempts++;
          debugPrint('OfflineQueue: replay error for ${action.id}: $e');
          if (action.attempts >= _maxAttemptsBeforeGiveUp) {
            _queue.removeWhere((a) => a.id == action.id);
          }
          await _persist();
        }
      }
    } finally {
      _flushing = false;
    }
  }

  Future<void> _replay(QueuedAction a) async {
    switch (a.type) {
      case QueuedActionType.startTrip:
        await TripService.startTrip(
          a.tripId,
          openingKm: (a.payload['opening_km'] as num).toDouble(),
          driverRemarks: a.payload['driver_remarks'] as String?,
          latitude: (a.payload['latitude'] as num?)?.toDouble(),
          longitude: (a.payload['longitude'] as num?)?.toDouble(),
          address: a.payload['address'] as String?,
        );
        break;
      case QueuedActionType.completeTrip:
        await TripService.completeTrip(
          a.tripId,
          closingKm: (a.payload['closing_km'] as num).toDouble(),
          passengerSignature: a.payload['passenger_signature'] as String,
          travellerName: a.payload['traveller_name'] as String,
          driverRemarks: a.payload['driver_remarks'] as String?,
          latitude: (a.payload['latitude'] as num?)?.toDouble(),
          longitude: (a.payload['longitude'] as num?)?.toDouble(),
          address: a.payload['address'] as String?,
        );
        break;
      case QueuedActionType.uploadPhoto:
        final path = a.payload['photo_path'] as String;
        final photoType = a.payload['photo_type'] as String;
        final file = File(path);
        if (!file.existsSync()) {
          // Photo was cleaned up; drop the action.
          return;
        }
        await TripService.uploadTripPhoto(a.tripId, file, photoType: photoType);
        break;
      case QueuedActionType.locationPing:
        await ApiService.post('/driver/location', a.payload);
        break;
    }
  }

  Future<void> clear() async {
    _queue.clear();
    await _persist();
  }
}
