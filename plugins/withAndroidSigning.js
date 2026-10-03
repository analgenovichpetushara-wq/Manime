/**
 * Expo config plugin: release signing for the Android build.
 *
 * `expo prebuild` regenerates `android/` from scratch, so the signing config
 * has to be injected at prebuild time rather than committed. The injected block
 * reads the keystore location and passwords from `android/keystore.properties`
 * or from the environment — never from the repository.
 *
 * Without a keystore the block logs a warning and leaves the release build
 * unsigned instead of silently falling back to the debug key.
 *
 * Secrets (set by CI, see docs/RELEASE.md):
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

android {
    if (animalcStoreFile && animalcStorePassword && animalcKeyAlias && animalcKeyPassword) {
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
        logger.lifecycle('[AnimAlc] no release keystore configured — release builds stay unsigned')
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
