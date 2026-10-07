import ExpoModulesCore

/// Runs the D49 backup exclusion natively at launch, before any JS (and so before expo-sqlite
/// or MMKV open their files). Independent of the JS bootstrap succeeding.
public class NoBackupAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    BackupExclusion.applyAll()
    return true
  }
}
