import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../config/theme.dart';
import '../models/trip.dart';
import '../providers/trip_provider.dart';
import 'start_trip_screen.dart';

class TripDetailScreen extends StatefulWidget {
  final String tripId;

  const TripDetailScreen({super.key, required this.tripId});

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  final _openingKmController = TextEditingController();
  Trip? _trip;

  @override
  void initState() {
    super.initState();
    _loadTrip();
  }

  @override
  void dispose() {
    _openingKmController.dispose();
    super.dispose();
  }

  Future<void> _loadTrip() async {
    final tripProvider = context.read<TripProvider>();
    _trip = await tripProvider.loadTripDetail(widget.tripId);
    setState(() {});
  }

  Future<void> _handleAccept() async {
    final tripProvider = context.read<TripProvider>();
    final success = await tripProvider.acceptTrip(widget.tripId);
    
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Trip accepted!'),
          backgroundColor: AppTheme.success,
        ),
      );
      _loadTrip();
    } else if (tripProvider.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tripProvider.error!),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  Future<void> _handleReject() async {
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => _RejectDialog(),
    );

    if (reason == null) return;

    final tripProvider = context.read<TripProvider>();
    final success = await tripProvider.rejectTrip(widget.tripId, reason: reason);
    
    if (success && mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Trip rejected'),
          backgroundColor: AppTheme.warning,
        ),
      );
    }
  }

  Future<void> _handleStart() async {
    if (_trip == null) return;
    // Push the full Start Trip flow (opening KM + location + photo).
    // The screen navigates to ActiveTripScreen on success itself.
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => StartTripScreen(trip: _trip!),
      ),
    );
    // In case user came back without starting, refresh
    if (mounted) _loadTrip();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Trip Details'),
      ),
      body: Consumer<TripProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && _trip == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final trip = _trip ?? provider.currentTrip;
          if (trip == null) {
            return const Center(child: Text('Trip not found'));
          }

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status Banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  color: _getStatusColor(trip.status).withOpacity(0.1),
                  child: Row(
                    children: [
                      Icon(
                        _getStatusIcon(trip.status),
                        color: _getStatusColor(trip.status),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        trip.statusDisplay,
                        style: TextStyle(
                          color: _getStatusColor(trip.status),
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Passenger Info
                      _buildSection(
                        'PASSENGER',
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              trip.passengerName,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            GestureDetector(
                              onTap: () {
                                // TODO: Open phone dialer
                              },
                              child: Row(
                                children: [
                                  Icon(Icons.phone, size: 16, color: AppTheme.primaryBlue),
                                  const SizedBox(width: 4),
                                  Text(
                                    trip.passengerPhone,
                                    style: TextStyle(
                                      color: AppTheme.primaryBlue,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Route
                      _buildSection(
                        'ROUTE',
                        Column(
                          children: [
                            _buildLocationRow(
                              'Pickup',
                              trip.pickupLocation,
                              Icons.radio_button_checked,
                              AppTheme.success,
                            ),
                            Container(
                              margin: const EdgeInsets.only(left: 11),
                              height: 30,
                              width: 2,
                              color: AppTheme.borderColor,
                            ),
                            _buildLocationRow(
                              'Dropoff',
                              trip.dropoffLocation,
                              Icons.location_on,
                              AppTheme.error,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Schedule
                      _buildSection(
                        'SCHEDULE',
                        Row(
                          children: [
                            Icon(Icons.schedule, size: 20, color: AppTheme.textSecondary),
                            const SizedBox(width: 8),
                            Text(
                              DateFormat('EEE, MMM d • h:mm a').format(trip.pickupTime),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Vehicle
                      _buildSection(
                        'VEHICLE',
                        Text(
                          trip.vehicleInfo,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Client
                      if (trip.clientName != null)
                        _buildSection(
                          'CLIENT',
                          Text(
                            trip.clientName!,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),

                      if (trip.notes != null && trip.notes!.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        _buildSection(
                          'NOTES',
                          Text(
                            trip.notes!,
                            style: TextStyle(
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: _trip != null ? _buildBottomActions(_trip!) : null,
    );
  }

  Widget _buildSection(String label, Widget content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppTheme.textSecondary,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        content,
      ],
    );
  }

  Widget _buildLocationRow(String label, String location, IconData icon, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 24, color: color),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: AppTheme.textSecondary,
                  letterSpacing: 0.5,
                ),
              ),
              Text(
                location,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBottomActions(Trip trip) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardBackground,
        border: Border(top: BorderSide(color: AppTheme.borderColor)),
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (trip.canAccept) ...[
              Expanded(
                child: OutlinedButton(
                  onPressed: _handleReject,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.error,
                    side: const BorderSide(color: AppTheme.error),
                  ),
                  child: const Text('REJECT'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _handleAccept,
                  child: const Text('ACCEPT TRIP'),
                ),
              ),
            ],
            if (trip.canStart)
              Expanded(
                child: ElevatedButton(
                  onPressed: _handleStart,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.success,
                  ),
                  child: const Text('START TRIP'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'ASSIGNED':
        return AppTheme.warning;
      case 'ACCEPTED':
        return AppTheme.primaryBlue;
      case 'STARTED':
        return AppTheme.success;
      default:
        return AppTheme.textSecondary;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'ASSIGNED':
        return Icons.notifications_active;
      case 'ACCEPTED':
        return Icons.check_circle;
      case 'STARTED':
        return Icons.directions_car;
      default:
        return Icons.info;
    }
  }
}

class _RejectDialog extends StatefulWidget {
  @override
  State<_RejectDialog> createState() => _RejectDialogState();
}

class _RejectDialogState extends State<_RejectDialog> {
  final _reasonController = TextEditingController();

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Reject Trip'),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Please provide a reason for rejection:'),
          const SizedBox(height: 16),
          TextField(
            controller: _reasonController,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Enter reason (optional)',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _reasonController.text),
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
          child: const Text('Reject'),
        ),
      ],
    );
  }
}

