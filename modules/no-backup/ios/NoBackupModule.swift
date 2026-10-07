import ExpoModulesCore

/// JS access for verification only (debug check, SPEC Verification log D49):
/// `getStatus()` reads the flag; `apply()` re-applies it and returns the same rows.
public class NoBackupModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NoBackup")

    Function("getStatus") { () -> [[String: Any]] in
      return BackupExclusion.statusAll()
    }

    Function("apply") { () -> [[String: Any]] in
      return BackupExclusion.applyAll()
    }
  }
}
