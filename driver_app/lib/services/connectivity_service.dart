import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Thin wrapper around connectivity_plus that gives us a single source of
/// truth for the current online status and a broadcast stream of changes.
class ConnectivityService {
  ConnectivityService._();
  static final ConnectivityService instance = ConnectivityService._();

  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _sub;
  final StreamController<bool> _onlineController = StreamController<bool>.broadcast();

  bool _isOnline = true;
  bool get isOnline => _isOnline;
  Stream<bool> get onStatusChange => _onlineController.stream;

  Future<void> init() async {
    final result = await _connectivity.checkConnectivity();
    _isOnline = _mapOnline(result);
    _sub?.cancel();
    _sub = _connectivity.onConnectivityChanged.listen((r) {
      final wasOnline = _isOnline;
      _isOnline = _mapOnline(r);
      if (wasOnline != _isOnline) {
        _onlineController.add(_isOnline);
      }
    });
  }

  void dispose() {
    _sub?.cancel();
    _onlineController.close();
  }

  bool _mapOnline(ConnectivityResult result) {
    return result != ConnectivityResult.none;
  }
}
