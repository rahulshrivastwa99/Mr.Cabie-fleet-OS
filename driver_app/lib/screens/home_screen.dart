import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../services/location_service.dart';
import '../services/connectivity_service.dart';
import '../services/offline_queue_service.dart';
import '../widgets/trip_card.dart';
import 'login_screen.dart';
import 'trip_detail_screen.dart';
import 'active_trip_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;
  bool _hasLoadedHistory = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadData();
    _initLocation();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadData();
    }
  }

  Future<void> _loadData() async {
    final tripProvider = context.read<TripProvider>();
    await tripProvider.loadActiveTrips();
    
    // If there's an active trip, start tracking
    if (tripProvider.activeInProgressTrip != null) {
      await LocationService.startTracking();
    }
  }

  Future<void> _initLocation() async {
    await LocationService.checkPermission();
  }

  void _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Logout', style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await LocationService.stopTracking();
      await context.read<AuthProvider>().logout();
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.local_taxi, size: 22, color: Colors.white),
            SizedBox(width: 8),
            Text('MR. CABIE',
                style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 2)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: Column(
        children: [
          const _OfflineStatusBar(),
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: [
                _buildTripsTab(),
                _buildHistoryTab(),
                _buildProfileTab(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        selectedItemColor: AppTheme.primaryBlue,
        unselectedItemColor: AppTheme.textSecondary,
        items: [
          BottomNavigationBarItem(
            icon: Consumer<TripProvider>(
              builder: (context, provider, child) {
                final count = provider.pendingTripsCount + provider.acceptedTripsCount;
                return Badge(
                  isLabelVisible: count > 0,
                  label: Text('$count'),
                  child: const Icon(Icons.directions_car),
                );
              },
            ),
            label: 'Trips',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'History',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildTripsTab() {
    return Consumer<TripProvider>(
      builder: (context, provider, child) {
        // Check for active in-progress trip
        final activeTrip = provider.activeInProgressTrip;
        if (activeTrip != null) {
          return ActiveTripBanner(
            trip: activeTrip,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ActiveTripScreen(tripId: activeTrip.id),
                ),
              );
            },
          );
        }

        if (provider.isLoading && provider.activeTrips.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.activeTrips.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.directions_car_outlined,
                  size: 64,
                  color: AppTheme.borderColor,
                ),
                const SizedBox(height: 16),
                Text(
                  'No Active Trips',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'You will see new assignments here',
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: _loadData,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh'),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: _loadData,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.activeTrips.length,
            itemBuilder: (context, index) {
              final trip = provider.activeTrips[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: TripCard(
                  trip: trip,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => TripDetailScreen(tripId: trip.id),
                      ),
                    ).then((_) => _loadData());
                  },
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildHistoryTab() {
    return Consumer<TripProvider>(
      builder: (context, provider, child) {
        if (!_hasLoadedHistory && !provider.isLoading) {
          _hasLoadedHistory = true;
          // Load history on first access
          WidgetsBinding.instance.addPostFrameCallback((_) {
            provider.loadTripHistory();
          });
        }

        if (provider.isLoading && provider.tripHistory.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.tripHistory.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.history,
                  size: 64,
                  color: AppTheme.borderColor,
                ),
                const SizedBox(height: 16),
                Text(
                  'No Trip History',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => provider.loadTripHistory(),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.tripHistory.length,
            itemBuilder: (context, index) {
              final trip = provider.tripHistory[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: TripCard(
                  trip: trip,
                  isHistory: true,
                  onTap: () {},
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildProfileTab() {
    final authProvider = context.watch<AuthProvider>();
    final driver = authProvider.currentDriver;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Profile Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.cardBackground,
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: AppTheme.primaryBlue.withOpacity(0.1),
                  child: Text(
                    driver?.name.substring(0, 1).toUpperCase() ?? 'D',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryBlue,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  driver?.name ?? 'Driver',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  driver?.phone ?? '',
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: _getStatusColor(driver?.status).withOpacity(0.1),
                    border: Border.all(color: _getStatusColor(driver?.status)),
                  ),
                  child: Text(
                    driver?.status ?? 'AVAILABLE',
                    style: TextStyle(
                      color: _getStatusColor(driver?.status),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Info Cards
          _buildInfoCard('License Number', driver?.licenseNumber ?? 'N/A', Icons.badge),
          _buildInfoCard('Email', driver?.email ?? 'N/A', Icons.email),
          _buildInfoCard('App', 'Mr. Cabie Driver v1.0.0', Icons.info_outline),
          _buildInfoCard(
            'Pending sync',
            '${OfflineQueueService.instance.pendingCount} item(s)',
            Icons.sync,
          ),
          
          const SizedBox(height: 24),
          
          // Logout Button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout, color: AppTheme.error),
              label: const Text('Logout', style: TextStyle(color: AppTheme.error)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.error),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '© Mr. Cabie Fleet OS',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 11, letterSpacing: 1),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(String label, String value, IconData icon) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardBackground,
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.textSecondary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
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
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'AVAILABLE':
        return AppTheme.success;
      case 'ON_DUTY':
        return AppTheme.primaryBlue;
      case 'OFF_DUTY':
        return AppTheme.textSecondary;
      case 'ON_LEAVE':
        return AppTheme.warning;
      default:
        return AppTheme.textSecondary;
    }
  }
}

class ActiveTripBanner extends StatelessWidget {
  final dynamic trip;
  final VoidCallback onTap;

  const ActiveTripBanner({
    super.key,
    required this.trip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Active Trip Banner
        GestureDetector(
          onTap: onTap,
          child: Container(
            width: double.infinity,
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.success,
              boxShadow: [
                BoxShadow(
                  color: AppTheme.success.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'TRIP IN PROGRESS',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    const Spacer(),
                    const Icon(Icons.arrow_forward, color: Colors.white),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  trip.passengerName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.location_on, color: Colors.white70, size: 16),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        '${trip.pickupLocation} → ${trip.dropoffLocation}',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Tap to view trip details',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: Center(
            child: Text(
              'Complete the active trip to receive new assignments',
              style: TextStyle(color: AppTheme.textSecondary),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ],
    );
  }
}

/// Slim banner at the top of the home screen that shows connection status
/// and the number of pending offline actions waiting to sync. Silent when
/// online AND the queue is empty (no visual noise for the happy path).
class _OfflineStatusBar extends StatefulWidget {
  const _OfflineStatusBar();

  @override
  State<_OfflineStatusBar> createState() => _OfflineStatusBarState();
}

class _OfflineStatusBarState extends State<_OfflineStatusBar> {
  bool _online = ConnectivityService.instance.isOnline;
  int _pending = OfflineQueueService.instance.pendingCount;

  @override
  void initState() {
    super.initState();
    ConnectivityService.instance.onStatusChange.listen((v) {
      if (mounted) setState(() => _online = v);
    });
    OfflineQueueService.instance.onSizeChange.listen((n) {
      if (mounted) setState(() => _pending = n);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_online && _pending == 0) return const SizedBox.shrink();
    final bg = _online ? AppTheme.warning : AppTheme.error;
    final icon = _online ? Icons.sync : Icons.wifi_off;
    final msg = _online
        ? 'Syncing $_pending pending item${_pending == 1 ? '' : 's'}…'
        : (_pending > 0
            ? 'Offline — $_pending item${_pending == 1 ? '' : 's'} queued. Will sync when back.'
            : 'You are offline. Actions will be queued.');
    return Container(
      width: double.infinity,
      color: bg,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              msg,
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
          if (_online && _pending > 0)
            TextButton(
              onPressed: () => OfflineQueueService.instance.flush(),
              child: const Text('SYNC', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11)),
            ),
        ],
      ),
    );
  }
}

