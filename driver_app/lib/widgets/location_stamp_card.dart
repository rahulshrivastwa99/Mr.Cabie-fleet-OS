import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/geocoding_service.dart';

/// Captures a live GPS + reverse-geocoded address (a "location stamp")
/// on demand. Shown as a card on the Start Trip and Complete Trip screens.
class LocationStampCard extends StatefulWidget {
  final String label;
  final String helper;
  final ValueChanged<LocationStamp?> onCaptured;
  final bool autoCapture;

  const LocationStampCard({
    super.key,
    required this.label,
    required this.helper,
    required this.onCaptured,
    this.autoCapture = true,
  });

  @override
  State<LocationStampCard> createState() => _LocationStampCardState();
}

class _LocationStampCardState extends State<LocationStampCard> {
  LocationStamp? _stamp;
  bool _capturing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.autoCapture) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _capture());
    }
  }

  Future<void> _capture() async {
    setState(() {
      _capturing = true;
      _error = null;
    });
    final stamp = await GeocodingService.captureCurrentStamp();
    if (!mounted) return;
    setState(() {
      _capturing = false;
      _stamp = stamp;
      _error = stamp == null
          ? 'Could not get GPS fix. Enable location and try again.'
          : null;
    });
    widget.onCaptured(stamp);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardBackground,
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  widget.label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                    letterSpacing: 1,
                  ),
                ),
              ),
              IconButton(
                onPressed: _capturing ? null : _capture,
                icon: _capturing
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh, size: 20),
                tooltip: 'Re-capture location',
              ),
            ],
          ),
          Text(
            widget.helper,
            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 12),
          if (_stamp != null) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.place, color: AppTheme.success, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _stamp!.address ?? 'Address unavailable',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_stamp!.latitude.toStringAsFixed(5)}, ${_stamp!.longitude.toStringAsFixed(5)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ] else if (_error != null) ...[
            Row(
              children: [
                Icon(Icons.error_outline, color: AppTheme.error, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _error!,
                    style: TextStyle(color: AppTheme.error, fontSize: 13),
                  ),
                ),
              ],
            ),
          ] else ...[
            Row(
              children: [
                const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 10),
                Text(
                  'Fetching your location...',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
