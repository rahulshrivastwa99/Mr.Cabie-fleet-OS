import 'package:flutter/material.dart';
import 'dart:convert';
import '../config/theme.dart';
import '../models/trip.dart';
import '../services/api_service.dart';

/// A read-only, print-friendly preview of a completed duty slip.
/// Shows all founder-requested trip artefacts in one place:
///   • Passenger + route + odometer
///   • Started_at / completed_at timestamps
///   • Start / end location stamps (address + coords)
///   • Start / end photos
///   • Traveller name + signature image (rendered from base64 PNG)
class DutySlipPreviewScreen extends StatelessWidget {
  final Trip trip;

  const DutySlipPreviewScreen({super.key, required this.trip});

  @override
  Widget build(BuildContext context) {
    final slip = trip.dutySlip;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Duty Slip'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            tooltip: 'Share summary',
            onPressed: () => _showShareInfo(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _brandHeader(),
            const SizedBox(height: 16),
            _section('TRIP',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _kv('Passenger', trip.passengerName),
                    _kv('Phone', trip.passengerPhone),
                    _kv('Trip type', trip.tripType),
                    _kv('Pickup', trip.pickupLocation),
                    _kv('Drop-off', trip.dropoffLocation),
                    _kv('Status', trip.status),
                  ],
                )),
            const SizedBox(height: 12),
            _section('TIMESTAMPS',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _kv('Started at', _fmt(slip?.startedAt ?? slip?.startTime)),
                    _kv('Completed at', _fmt(slip?.completedAt ?? slip?.endTime)),
                    _kv('Opening KM', slip?.openingKm?.toStringAsFixed(1) ?? '-'),
                    _kv('Closing KM', slip?.closingKm?.toStringAsFixed(1) ?? '-'),
                    _kv('Total KM', slip?.totalKm?.toStringAsFixed(1) ?? '-'),
                  ],
                )),
            const SizedBox(height: 12),
            _section('LOCATION STAMPS',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _locationRow('Pickup stamp', slip?.startLocation, AppTheme.success),
                    const SizedBox(height: 10),
                    _locationRow('Drop stamp', slip?.endLocation, AppTheme.error),
                  ],
                )),
            const SizedBox(height: 12),
            _section('PHOTOS',
                child: Row(
                  children: [
                    Expanded(child: _photoTile('Start', slip?.startPhotoUrl)),
                    const SizedBox(width: 8),
                    Expanded(child: _photoTile('End', slip?.endPhotoUrl)),
                  ],
                )),
            const SizedBox(height: 12),
            _section('TRAVELLER',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _kv('Name', slip?.travellerName ?? '-'),
                    const SizedBox(height: 8),
                    Text('Signature',
                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, letterSpacing: 1, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    _signatureImage(slip?.passengerSignature),
                  ],
                )),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.check_circle_outline),
              label: const Text('DONE'),
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _brandHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryBlue,
        border: Border.all(color: AppTheme.primaryBlue),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(color: Colors.white),
            child: Icon(Icons.local_taxi, color: AppTheme.primaryBlue, size: 28),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('MR. CABIE',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: 2, fontSize: 18)),
                SizedBox(height: 2),
                Text('DUTY SLIP',
                    style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w500, letterSpacing: 1, fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('ID', style: TextStyle(color: Colors.white70, fontSize: 10, letterSpacing: 1)),
              Text(trip.dutySlip?.id.substring(0, 8) ?? '-',
                  style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _section(String title, {required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1.5)),
          const SizedBox(height: 8),
          Divider(height: 1, color: AppTheme.borderColor),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _kv(String key, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(key,
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }

  Widget _locationRow(String label, Map<String, dynamic>? loc, Color accent) {
    if (loc == null) {
      return Row(
        children: [
          Icon(Icons.place_outlined, color: AppTheme.textSecondary, size: 20),
          const SizedBox(width: 8),
          Text('$label: not captured', style: TextStyle(color: AppTheme.textSecondary)),
        ],
      );
    }
    final lat = (loc['latitude'] as num?)?.toDouble();
    final lng = (loc['longitude'] as num?)?.toDouble();
    final address = loc['address'] as String?;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.place, color: accent, size: 22),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, letterSpacing: 1)),
              const SizedBox(height: 2),
              Text(address ?? 'Address unavailable',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
              if (lat != null && lng != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _photoTile(String label, String? url) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, letterSpacing: 1)),
        const SizedBox(height: 6),
        Container(
          height: 130,
          decoration: BoxDecoration(
            color: AppTheme.background,
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: url == null || url.isEmpty
              ? Center(
                  child: Icon(Icons.image_not_supported_outlined,
                      color: AppTheme.textSecondary, size: 32),
                )
              : Image.network(
                  '${ApiService.baseUrl.replaceAll('/api', '')}$url',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Center(
                    child: Icon(Icons.broken_image_outlined,
                        color: AppTheme.textSecondary, size: 32),
                  ),
                  loadingBuilder: (_, child, progress) =>
                      progress == null ? child : const Center(child: CircularProgressIndicator()),
                ),
        ),
      ],
    );
  }

  Widget _signatureImage(String? signatureBase64) {
    if (signatureBase64 == null || signatureBase64.isEmpty) {
      return Container(
        height: 100,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: AppTheme.background, border: Border.all(color: AppTheme.borderColor)),
        child: Text('No signature captured', style: TextStyle(color: AppTheme.textSecondary)),
      );
    }
    try {
      final bytes = base64Decode(signatureBase64);
      return Container(
        height: 120,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(color: Colors.white, border: Border.all(color: AppTheme.borderColor, width: 1.5)),
        child: Image.memory(bytes, fit: BoxFit.contain),
      );
    } catch (_) {
      return Container(
        height: 100,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: AppTheme.background, border: Border.all(color: AppTheme.borderColor)),
        child: Text('Could not render signature', style: TextStyle(color: AppTheme.error)),
      );
    }
  }

  String _fmt(String? iso) {
    if (iso == null || iso.isEmpty) return '-';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final y = dt.year, m = dt.month.toString().padLeft(2, '0'), d = dt.day.toString().padLeft(2, '0');
      final hh = dt.hour.toString().padLeft(2, '0'), mm = dt.minute.toString().padLeft(2, '0');
      return '$d/$m/$y  $hh:$mm';
    } catch (_) {
      return iso;
    }
  }

  void _showShareInfo(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sharing / PDF export coming soon')),
    );
  }
}
