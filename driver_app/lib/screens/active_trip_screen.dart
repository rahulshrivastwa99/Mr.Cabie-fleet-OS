import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:signature/signature.dart';
import '../config/theme.dart';
import '../models/trip.dart';
import '../providers/trip_provider.dart';
import '../services/geocoding_service.dart';
import '../services/location_service.dart';
import '../widgets/location_stamp_card.dart';
import '../widgets/photo_capture_card.dart';

class ActiveTripScreen extends StatefulWidget {
  final String tripId;

  const ActiveTripScreen({super.key, required this.tripId});

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  Trip? _trip;
  bool _isCompleting = false;

  @override
  void initState() {
    super.initState();
    _loadTrip();
  }

  Future<void> _loadTrip() async {
    final tripProvider = context.read<TripProvider>();
    _trip = await tripProvider.loadTripDetail(widget.tripId);
    setState(() {});
  }

  Future<void> _handleComplete() async {
    setState(() => _isCompleting = true);

    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (context) => CompleteTripScreen(trip: _trip!),
      ),
    );

    setState(() => _isCompleting = false);

    if (result == null) return;

    final tripProvider = context.read<TripProvider>();
    final totalKm = await tripProvider.completeTrip(
      widget.tripId,
      result['closing_km'],
      result['signature'],
      travellerName: result['traveller_name'],
      remarks: result['remarks'],
      latitude: result['latitude'],
      longitude: result['longitude'],
      address: result['address'],
      photo: result['photo'],
    );

    if (totalKm != null && mounted) {
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
          title: Row(
            children: [
              Icon(Icons.check_circle, color: AppTheme.success, size: 28),
              const SizedBox(width: 12),
              const Text('Trip Completed!'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Total distance: ${totalKm.toStringAsFixed(1)} KM'),
              const SizedBox(height: 8),
              Text(
                'Duty slip has been signed with timestamp, location & photo.',
                style: TextStyle(color: AppTheme.textSecondary),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Back to home
              },
              child: const Text('Done'),
            ),
          ],
        ),
      );
    } else if (tripProvider.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tripProvider.error!),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Active Trip'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _trip == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                children: [
                  // Active Status Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    color: AppTheme.success,
                    child: Column(
                      children: [
                        const Icon(Icons.directions_car, color: Colors.white, size: 48),
                        const SizedBox(height: 12),
                        const Text(
                          'TRIP IN PROGRESS',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Location is being tracked',
                          style: TextStyle(color: Colors.white.withOpacity(0.8)),
                        ),
                        if (LocationService.lastPosition != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Last update: ${LocationService.lastPosition!.latitude.toStringAsFixed(4)}, ${LocationService.lastPosition!.longitude.toStringAsFixed(4)}',
                            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Trip Details
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        _buildCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PASSENGER',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textSecondary,
                                  letterSpacing: 1,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _trip!.passengerName,
                                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 8),
                              OutlinedButton.icon(
                                onPressed: () {},
                                icon: const Icon(Icons.phone, size: 18),
                                label: Text(_trip!.passengerPhone),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ROUTE',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textSecondary,
                                  letterSpacing: 1,
                                ),
                              ),
                              const SizedBox(height: 12),
                              _buildLocationRow('Pickup', _trip!.pickupLocation, AppTheme.success),
                              Container(
                                margin: const EdgeInsets.only(left: 11),
                                height: 20,
                                width: 2,
                                color: AppTheme.borderColor,
                              ),
                              _buildLocationRow('Dropoff', _trip!.dropoffLocation, AppTheme.error),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton.icon(
                                  onPressed: () {},
                                  icon: const Icon(Icons.navigation),
                                  label: const Text('Navigate to Dropoff'),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (_trip!.dutySlip != null)
                          _buildCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'DUTY SLIP',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textSecondary,
                                    letterSpacing: 1,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildInfoItem(
                                        'Opening KM',
                                        '${_trip!.dutySlip!.openingKm?.toStringAsFixed(1) ?? "-"}',
                                      ),
                                    ),
                                    Expanded(
                                      child: _buildInfoItem(
                                        'Started at',
                                        _formatTime(_trip!.dutySlip!.startedAt ?? _trip!.dutySlip!.startTime),
                                      ),
                                    ),
                                  ],
                                ),
                                if (_trip!.dutySlip!.startLocation != null) ...[
                                  const SizedBox(height: 12),
                                  _buildInfoItem(
                                    'Pickup stamp',
                                    (_trip!.dutySlip!.startLocation!['address'] as String?) ??
                                        '${_trip!.dutySlip!.startLocation!['latitude']}, ${_trip!.dutySlip!.startLocation!['longitude']}',
                                  ),
                                ],
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
      bottomNavigationBar: _trip != null
          ? Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.cardBackground,
                border: Border(top: BorderSide(color: AppTheme.borderColor)),
              ),
              child: SafeArea(
                child: ElevatedButton(
                  onPressed: _isCompleting ? null : _handleComplete,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.error,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isCompleting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('END TRIP'),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardBackground,
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: child,
    );
  }

  Widget _buildLocationRow(String label, String location, Color color) {
    return Row(
      children: [
        Icon(Icons.circle, size: 24, color: color),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
              Text(location, style: const TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      ],
    );
  }

  String _formatTime(String? isoTime) {
    if (isoTime == null) return '-';
    try {
      final dt = DateTime.parse(isoTime).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return '-';
    }
  }
}

// Complete Trip Screen with Signature
class CompleteTripScreen extends StatefulWidget {
  final Trip trip;

  const CompleteTripScreen({super.key, required this.trip});

  @override
  State<CompleteTripScreen> createState() => _CompleteTripScreenState();
}

class _CompleteTripScreenState extends State<CompleteTripScreen> {
  final _closingKmController = TextEditingController();
  final _travellerNameController = TextEditingController();
  final _remarksController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
  );

  LocationStamp? _endLocation;
  File? _endPhoto;
  int _currentStep = 0;

  @override
  void dispose() {
    _closingKmController.dispose();
    _travellerNameController.dispose();
    _remarksController.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_travellerNameController.text.trim().isEmpty) {
      _showError('Traveller name is required.');
      return;
    }
    if (_endPhoto == null) {
      _showError('Please capture a drop-off/vehicle photo.');
      return;
    }
    if (_signatureController.isEmpty) {
      _showError('Traveller signature is required.');
      return;
    }

    final signatureBytes = await _signatureController.toPngBytes();
    if (signatureBytes == null) return;
    final signatureBase64 = base64Encode(signatureBytes);

    if (!mounted) return;
    Navigator.pop(context, {
      'closing_km': double.parse(_closingKmController.text),
      'traveller_name': _travellerNameController.text.trim(),
      'signature': signatureBase64,
      'remarks': _remarksController.text.isEmpty ? null : _remarksController.text,
      'latitude': _endLocation?.latitude,
      'longitude': _endLocation?.longitude,
      'address': _endLocation?.address,
      'photo': _endPhoto,
    });
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppTheme.error),
    );
  }

  bool _validateStep0() {
    if (!(_formKey.currentState?.validate() ?? false)) return false;
    if (_endPhoto == null) {
      _showError('Please capture a drop-off/vehicle photo before continuing.');
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Complete Trip')),
      body: Stepper(
        currentStep: _currentStep,
        onStepContinue: () {
          if (_currentStep == 0) {
            if (_validateStep0()) setState(() => _currentStep = 1);
          } else {
            _handleSubmit();
          }
        },
        onStepCancel: () {
          if (_currentStep > 0) {
            setState(() => _currentStep--);
          } else {
            Navigator.pop(context);
          }
        },
        controlsBuilder: (context, details) {
          return Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: details.onStepContinue,
                    child: Text(_currentStep == 1 ? 'COMPLETE' : 'CONTINUE'),
                  ),
                ),
                const SizedBox(width: 12),
                TextButton(
                  onPressed: details.onStepCancel,
                  child: Text(_currentStep == 0 ? 'CANCEL' : 'BACK'),
                ),
              ],
            ),
          );
        },
        steps: [
          Step(
            title: const Text('Trip details, location & photo'),
            subtitle: const Text('Closing KM, drop-off stamp & photo'),
            isActive: _currentStep >= 0,
            state: _currentStep > 0 ? StepState.complete : StepState.indexed,
            content: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Opening KM reference
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryBlue.withOpacity(0.05),
                      border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: AppTheme.primaryBlue, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Opening KM: ${widget.trip.dutySlip?.openingKm?.toStringAsFixed(1) ?? "-"}',
                          style: TextStyle(color: AppTheme.primaryBlue),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _closingKmController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'CLOSING KM',
                      hintText: 'Enter current odometer reading',
                      suffixText: 'KM',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'Please enter closing KM';
                      final km = double.tryParse(value);
                      if (km == null) return 'Please enter a valid number';
                      final openingKm = widget.trip.dutySlip?.openingKm ?? 0;
                      if (km < openingKm) return 'Closing KM cannot be less than opening KM';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _remarksController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'DRIVER REMARKS (OPTIONAL)',
                      hintText: 'Any comments about the trip',
                    ),
                  ),
                  const SizedBox(height: 16),
                  LocationStampCard(
                    label: 'DROP LOCATION STAMP',
                    helper: 'GPS + address of the trip end point.',
                    onCaptured: (stamp) => setState(() => _endLocation = stamp),
                  ),
                  const SizedBox(height: 12),
                  PhotoCaptureCard(
                    label: 'DROP PHOTO',
                    helper: 'Snap the odometer or drop-off scene.',
                    onCaptured: (file) => setState(() => _endPhoto = file),
                  ),
                ],
              ),
            ),
          ),
          Step(
            title: const Text('Traveller signature'),
            subtitle: const Text('Name & signature to complete'),
            isActive: _currentStep >= 1,
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _travellerNameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'TRAVELLER NAME',
                    hintText: 'Who is signing the duty slip?',
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Please ask the traveller to sign below:',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 12),
                Container(
                  height: 200,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: AppTheme.borderColor, width: 2),
                  ),
                  child: Signature(
                    controller: _signatureController,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () => _signatureController.clear(),
                      icon: const Icon(Icons.refresh),
                      label: const Text('Clear'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.warning.withOpacity(0.1),
                    border: Border.all(color: AppTheme.warning),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: AppTheme.warning, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Note: Additional charges (Toll, Parking, GST) will be added in the final invoice.',
                          style: TextStyle(color: AppTheme.warning, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
