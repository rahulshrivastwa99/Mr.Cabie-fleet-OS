import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../models/trip.dart';
import '../providers/trip_provider.dart';
import '../services/geocoding_service.dart';
import '../widgets/location_stamp_card.dart';
import '../widgets/photo_capture_card.dart';
import 'active_trip_screen.dart';

/// Full-screen "Start Trip" flow that collects:
///   1. Opening KM (odometer reading)
///   2. Driver remarks (optional)
///   3. Location stamp (GPS + address) — captured automatically
///   4. Odometer / vehicle photo (camera)
///
/// On submit, the provider posts to /api/driver/trips/{id}/start with
/// timestamp + location and uploads the photo to the photo endpoint.
class StartTripScreen extends StatefulWidget {
  final Trip trip;

  const StartTripScreen({super.key, required this.trip});

  @override
  State<StartTripScreen> createState() => _StartTripScreenState();
}

class _StartTripScreenState extends State<StartTripScreen> {
  final _formKey = GlobalKey<FormState>();
  final _openingKmController = TextEditingController();
  final _remarksController = TextEditingController();

  LocationStamp? _locationStamp;
  File? _photo;
  bool _submitting = false;

  @override
  void dispose() {
    _openingKmController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _handleStart() async {
    if (!_formKey.currentState!.validate()) return;

    if (_photo == null) {
      _showError('Please capture a photo of the odometer/vehicle to start the trip.');
      return;
    }

    setState(() => _submitting = true);

    final provider = context.read<TripProvider>();
    final success = await provider.startTrip(
      widget.trip.id,
      double.parse(_openingKmController.text),
      remarks: _remarksController.text.isEmpty ? null : _remarksController.text,
      latitude: _locationStamp?.latitude,
      longitude: _locationStamp?.longitude,
      address: _locationStamp?.address,
      photo: _photo,
    );

    if (!mounted) return;
    setState(() => _submitting = false);

    if (success) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => ActiveTripScreen(tripId: widget.trip.id),
        ),
      );
    } else if (provider.error != null) {
      _showError(provider.error!);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Start Trip')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  color: AppTheme.primaryBlue.withOpacity(0.08),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PASSENGER',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.textSecondary,
                          letterSpacing: 1,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.trip.passengerName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text('${widget.trip.pickupLocation}  →  ${widget.trip.dropoffLocation}'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 1. Opening KM
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.cardBackground,
                    border: Border.all(color: AppTheme.borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '1. OPENING KM',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _openingKmController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Odometer reading',
                          hintText: 'e.g., 45230',
                          suffixText: 'KM',
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Please enter opening KM';
                          if (double.tryParse(value) == null) return 'Enter a valid number';
                          if (double.parse(value) < 0) return 'Cannot be negative';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _remarksController,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Driver remarks (optional)',
                          hintText: 'Any starting notes',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 2. Location stamp
                LocationStampCard(
                  label: '2. PICKUP LOCATION STAMP',
                  helper: 'We record where you started the trip. Tap refresh to re-capture.',
                  onCaptured: (stamp) => setState(() => _locationStamp = stamp),
                ),
                const SizedBox(height: 12),

                // 3. Camera capture
                PhotoCaptureCard(
                  label: '3. START PHOTO',
                  helper: 'Snap the odometer or vehicle before starting.',
                  onCaptured: (file) => setState(() => _photo = file),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: _submitting ? null : _handleStart,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.success,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: _submitting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('START TRIP'),
          ),
        ),
      ),
    );
  }
}
