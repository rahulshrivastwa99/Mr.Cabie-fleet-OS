import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../config/theme.dart';

/// Founder-requested security guardrail: if the driver denies Camera or
/// Location permissions we must never crash. Instead we surface a
/// friendly dialog that explains WHY the permission is needed and offers
/// an "Open Settings" button that deep-links to the system settings.
class PermissionHelpers {
  static Future<bool> ensureLocation(BuildContext context) async {
    final status = await Permission.locationWhenInUse.request();
    if (status.isGranted) return true;
    if (context.mounted) {
      await _showBlockedDialog(
        context,
        title: 'Location permission needed',
        body: 'Mr. Cabie stamps every trip with a pickup and drop-off GPS location. '
            'Please enable location access to start or complete this trip.',
        permanentlyDenied: status.isPermanentlyDenied,
      );
    }
    return false;
  }

  static Future<bool> ensureCamera(BuildContext context) async {
    final status = await Permission.camera.request();
    if (status.isGranted || status.isLimited) return true;
    if (context.mounted) {
      await _showBlockedDialog(
        context,
        title: 'Camera permission needed',
        body: 'Please enable camera access so you can capture the odometer / drop-off photo required to complete the duty slip.',
        permanentlyDenied: status.isPermanentlyDenied,
      );
    }
    return false;
  }

  static Future<void> _showBlockedDialog(
    BuildContext context, {
    required String title,
    required String body,
    required bool permanentlyDenied,
  }) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
        title: Row(
          children: [
            Icon(Icons.lock_outline, color: AppTheme.warning),
            const SizedBox(width: 8),
            Expanded(child: Text(title)),
          ],
        ),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('NOT NOW'),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.settings, size: 18),
            label: Text(permanentlyDenied ? 'OPEN SETTINGS' : 'ENABLE'),
            onPressed: () async {
              await openAppSettings();
              if (ctx.mounted) Navigator.pop(ctx);
            },
          ),
        ],
      ),
    );
  }
}
