import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

/// Utilities for working with driver-captured photos: compression to
/// prevent OOM crashes on budget devices, plus a small helper that copies
/// the image into the app's cache so it survives the temporary directory
/// clean-up that some Android versions perform on picker images.
class PhotoService {
  /// Compresses [file] to a reasonably sized JPEG in the app cache and
  /// returns the resulting file. If compression fails for any reason we
  /// fall back to the original file so the upload can still proceed.
  static Future<File> compress(File file) async {
    try {
      final cacheDir = await getTemporaryDirectory();
      final targetPath = p.join(
        cacheDir.path,
        'mrcabie_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      final result = await FlutterImageCompress.compressAndGetFile(
        file.absolute.path,
        targetPath,
        quality: 70,
        minWidth: 1280,
        minHeight: 1280,
        format: CompressFormat.jpeg,
        keepExif: false,
      );
      if (result == null) return file;
      return File(result.path);
    } catch (e) {
      debugPrint('PhotoService.compress failed, using original: $e');
      return file;
    }
  }

  /// Persists [source] into the app's documents dir so the file survives
  /// even after the offline queue is replayed later. Returns the new path.
  static Future<File> persistToAppDir(File source) async {
    final docsDir = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(docsDir.path, 'mrcabie_photos'));
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }
    final target = File(p.join(dir.path, p.basename(source.path)));
    return source.copy(target.path);
  }
}
