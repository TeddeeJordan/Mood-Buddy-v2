# Local Expo module (SPEC D49, docs/adr/006-no-backup.md). Autolinked from ./modules.
Pod::Spec.new do |s|
  s.name           = 'NoBackup'
  s.version        = '1.0.0'
  s.summary        = 'Excludes Mood Buddy data directories from iOS backups (D49).'
  s.description    = 'Sets NSURLIsExcludedFromBackupKey on the app Documents and Application Support directories at every launch.'
  s.license        = 'MIT'
  s.author         = 'teddeej'
  s.homepage       = 'https://github.com/teddeej/mood-buddy-v2'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
