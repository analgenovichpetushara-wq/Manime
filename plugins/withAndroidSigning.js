/**
 * Expo config plugin: release signing for the Android build.
 *
 * `expo prebuild` regenerates `android/` from scratch, so the signing config
 * has to be injected at prebuild time rather than committed. The injected block
 * reads the keystore location and passwords from `android/keystore.properties`
 * or from the environment — never from the repository.
 *
 * Without a keystore an "unsigned" release APK is produced, and Android refuses
 * to install it with a misleading "package is corrupt" message. The injected
 * guard therefore fails `assembleRelease`/`bundleRelease` with instructions
 * instead of producing an artifact nobody can install. Debug builds are
 * unaffected (they use the template's debug key).
 *
 * Secrets (set by CI or scripts/build-android.sh, see docs/RELEASE.md):
 *   ANIMALC_UPLOAD_STORE_FILE     path to the .keystore
 *   ANIMALC_UPLOAD_STORE_PASSWORD
 *   ANIMALC_UPLOAD_KEY_ALIAS
 *   ANIMALC_UPLOAD_KEY_PASSWORD
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER_BEGIN = '// ANIMALC_SIGNING_BEGIN';
const MARKER_END = '// ANIMALC_SIGNING_END';

const BLOCK = `${MARKER_BEGIN} — injected by plugins/withAndroidSigning.js, do not edit
def animalcKeystoreProps = new Properties()
def animalcKeystoreFile = rootProject.file('keystore.properties')
if (animalcKeystoreFile.exists()) {
    animalcKeystoreFile.withInputStream { stream -> animalcKeystoreProps.load(stream) }
}

def animalcStoreFile = animalcKeystoreProps['storeFile'] ?: System.getenv('ANIMALC_UPLOAD_STORE_FILE')
def animalcStorePassword = animalcKeystoreProps['storePassword'] ?: System.getenv('ANIMALC_UPLOAD_STORE_PASSWORD')
def animalcKeyAlias = animalcKeystoreProps['keyAlias'] ?: System.getenv('ANIMALC_UPLOAD_KEY_ALIAS')
def animalcKeyPassword = animalcKeystoreProps['keyPassword'] ?: System.getenv('ANIMALC_UPLOAD_KEY_PASSWORD')
def animalcSigningReady = animalcStoreFile && animalcStorePassword && animalcKeyAlias && animalcKeyPassword

android {
    if (animalcSigningReady) {
        signingConfigs {
            animalcRelease {
                storeFile file(animalcStoreFile)
                storePassword animalcStorePassword
                keyAlias animalcKeyAlias
                keyPassword animalcKeyPassword
            }
        }
        // Overrides the debug key the Expo template assigns to the release build.
        buildTypes {
            release {
                signingConfig signingConfigs.animalcRelease
            }
        }
        logger.lifecycle('[AnimAlc] release signing enabled for alias ' + animalcKeyAlias)
    } else {
        logger.lifecycle('[AnimAlc] no release keystore configured — release builds are blocked, debug builds are unaffected')
        // An unsigned APK/AAB cannot be installed; Android reports it as a
        // damaged package. Fail loudly instead of shipping a broken artifact.
        gradle.taskGraph.whenReady { graph ->
            def releaseRequested = graph.allTasks.any { task ->
                task.path.endsWith('assembleRelease') || task.path.endsWith('bundleRelease')
            }
            if (releaseRequested) {
                throw new GradleException('''
[AnimAlc] Refusing to build an UNSIGNED release.

An unsigned APK cannot be installed: Android shows "package is corrupt" /
"Пакет повреждён". Configure a keystore and build again:

  ./scripts/build-android.sh          # generates a keystore and builds a signed release

or manually:

  ./scripts/make-keystore.sh
  export ANIMALC_UPLOAD_STORE_FILE="$PWD/animalc-release.keystore"
  export ANIMALC_UPLOAD_STORE_PASSWORD=<store password>
  export ANIMALC_UPLOAD_KEY_ALIAS=animalc
  export ANIMALC_UPLOAD_KEY_PASSWORD=<key password>
  npx expo prebuild -p android --clean
  cd android && ./gradlew assembleRelease

Just need something installable right now? Build the debug variant instead:

  cd android && ./gradlew assembleDebug
''')
            }
        }
    }
}
${MARKER_END}`;

function withAndroidSigning(config) {
  return withAppBuildGradle(config, (modConfig) => {
    const contents = modConfig.modResults.contents ?? '';
    if (contents.includes(MARKER_BEGIN)) return modConfig;
    modConfig.modResults.contents = `${contents.trimEnd()}\n\n${BLOCK}\n`;
    return modConfig;
  });
}

module.exports = withAndroidSigning;
module.exports.withAndroidSigning = withAndroidSigning;
module.exports.default = withAndroidSigning;
