import Foundation

/// SPEC D49 / ADR 006: Mood Buddy data is never included in iCloud or computer backups.
///
/// The flag is set on whole directories; Apple's guidance is that excluding a directory
/// excludes the files in it ("move those files into a directory and update the directory's
/// resource value"). Certain file operations can reset the flag, so it is re-applied on
/// every launch. Covered locations:
/// - Documents: expo-sqlite's default directory (Documents/SQLite), MMKV's default root
///   (Documents/mmkv) and any future user files (profile photo, D49 designated location).
/// - Library/Application Support: reserved for future app data; created if missing.
/// Library/Caches and tmp are never backed up by iOS. Library/Preferences (UserDefaults)
/// is not touched: the app stores no user data there (CLAUDE.md, Storage and security).
enum BackupExclusion {
  static func targetDirectories() -> [URL] {
    let fileManager = FileManager.default
    let searchPaths: [FileManager.SearchPathDirectory] = [.documentDirectory, .applicationSupportDirectory]
    return searchPaths.compactMap { fileManager.urls(for: $0, in: .userDomainMask).first }
  }

  /// Creates each target directory if needed and marks it excluded from backup.
  /// Never throws: a failure must not block app launch. Returns one status row per directory.
  @discardableResult
  static func applyAll() -> [[String: Any]] {
    return targetDirectories().map { url in
      var error: String?
      do {
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var mutableURL = url
        try mutableURL.setResourceValues(values)
      } catch let caught {
        error = caught.localizedDescription
      }
      return status(for: url, error: error)
    }
  }

  static func statusAll() -> [[String: Any]] {
    return targetDirectories().map { status(for: $0, error: nil) }
  }

  private static func status(for url: URL, error: String?) -> [String: Any] {
    var fresh = url
    fresh.removeAllCachedResourceValues()
    let excluded = (try? fresh.resourceValues(forKeys: [.isExcludedFromBackupKey]))?.isExcludedFromBackup ?? false
    var row: [String: Any] = ["path": url.path, "excluded": excluded]
    if let error {
      row["error"] = error
    }
    return row
  }
}
