import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/trip_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/api_service.dart';
import 'services/connectivity_service.dart';
import 'services/offline_queue_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MrCabieDriverApp());
}

class MrCabieDriverApp extends StatelessWidget {
  const MrCabieDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => TripProvider()),
      ],
      child: MaterialApp(
        title: 'Mr. Cabie Driver',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        // GlobalKey enables us to navigate from anywhere (auth expiry handler)
        navigatorKey: appNavigatorKey,
        home: const AppWrapper(),
      ),
    );
  }
}

/// Global navigator so background handlers (like auth expiry) can navigate
/// safely without needing a BuildContext.
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

class AppWrapper extends StatefulWidget {
  const AppWrapper({super.key});

  @override
  State<AppWrapper> createState() => _AppWrapperState();
}

class _AppWrapperState extends State<AppWrapper> {
  bool _isInitialized = false;
  StreamSubscription<AuthEvent>? _authSub;

  @override
  void initState() {
    super.initState();
    _initApp();
  }

  Future<void> _initApp() async {
    // Wire up connectivity + offline queue before auth so any queued actions
    // start flushing the moment we have both a session and a network.
    await ConnectivityService.instance.init();
    await OfflineQueueService.instance.init();

    await context.read<AuthProvider>().init();

    // Founder-requested security guardrail: when the backend rejects our
    // token, safely bounce the driver to the login screen.
    _authSub = AuthEvents.stream.listen((event) {
      if (event == AuthEvent.unauthorized) {
        _handleUnauthorized();
      }
    });

    // Kick off an initial flush in case there are actions from a previous session
    OfflineQueueService.instance.flush();

    setState(() => _isInitialized = true);
  }

  Future<void> _handleUnauthorized() async {
    if (!mounted) return;
    // Silent logout — no error dialog needed, snackbar is friendlier.
    await context.read<AuthProvider>().logout();
    final nav = appNavigatorKey.currentState;
    if (nav != null) {
      nav.popUntil((route) => route.isFirst);
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Session expired. Please log in again.'),
        backgroundColor: AppTheme.warning,
      ),
    );
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue,
                  shape: BoxShape.rectangle,
                ),
                child: const Icon(Icons.local_taxi, color: Colors.white, size: 48),
              ),
              const SizedBox(height: 20),
              Text(
                'MR. CABIE',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary,
                  letterSpacing: 3,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'DRIVER APP',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                  letterSpacing: 3,
                ),
              ),
              const SizedBox(height: 40),
              const CircularProgressIndicator(),
            ],
          ),
        ),
      );
    }

    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        if (authProvider.isLoggedIn) {
          return const HomeScreen();
        }
        return const LoginScreen();
      },
    );
  }
}
