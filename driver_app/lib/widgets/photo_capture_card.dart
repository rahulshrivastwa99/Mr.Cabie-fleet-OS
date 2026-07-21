import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../config/theme.dart';
import '../services/photo_service.dart';
import '../utils/permission_helpers.dart';

/// A card that lets the driver capture (or replace) a photo from the
/// camera. When a photo is captured [onCaptured] is fired with the file.
///
/// Used on trip start (odometer/vehicle photo) and on trip completion
/// (drop-off/vehicle photo).
class PhotoCaptureCard extends StatefulWidget {
  final String label;
  final String helper;
  final File? initialPhoto;
  final ValueChanged<File?> onCaptured;

  const PhotoCaptureCard({
    super.key,
    required this.label,
    required this.helper,
    required this.onCaptured,
    this.initialPhoto,
  });

  @override
  State<PhotoCaptureCard> createState() => _PhotoCaptureCardState();
}

class _PhotoCaptureCardState extends State<PhotoCaptureCard> {
  File? _photo;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _photo = widget.initialPhoto;
  }

  Future<void> _pickFromCamera() async {
    // Founder-requested guardrail: gate on Camera permission before opening picker
    final ok = await PermissionHelpers.ensureCamera(context);
    if (!ok) return;

    setState(() => _busy = true);
    try {
      final picker = ImagePicker();
      final xfile = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 75,
        maxWidth: 1600,
        preferredCameraDevice: CameraDevice.rear,
      );
      if (xfile == null) return;
      // Compress the picture to keep low-RAM devices happy and speed up uploads
      final compressed = await PhotoService.compress(File(xfile.path));
      final persisted = await PhotoService.persistToAppDir(compressed);
      setState(() => _photo = persisted);
      widget.onCaptured(persisted);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Camera error: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _clear() {
    setState(() => _photo = null);
    widget.onCaptured(null);
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
          Text(
            widget.label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondary,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            widget.helper,
            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 12),
          if (_photo != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: Image.file(
                _photo!,
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _busy ? null : _pickFromCamera,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('RETAKE'),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _busy ? null : _clear,
                  icon: Icon(Icons.delete_outline, color: AppTheme.error),
                  tooltip: 'Remove photo',
                ),
              ],
            ),
          ] else ...[
            InkWell(
              onTap: _busy ? null : _pickFromCamera,
              child: Container(
                height: 140,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  border: Border.all(
                    color: AppTheme.borderColor,
                    style: BorderStyle.solid,
                    width: 2,
                  ),
                ),
                child: Center(
                  child: _busy
                      ? const CircularProgressIndicator()
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.camera_alt_outlined,
                              size: 40,
                              color: AppTheme.textSecondary,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'TAP TO OPEN CAMERA',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textSecondary,
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
