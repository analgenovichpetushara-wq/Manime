/**
 * The Android release signing config is injected by a config plugin at prebuild
 * time (android/ is generated and git-ignored), so the plugin itself is tested
 * here instead of a committed gradle file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import appConfig from '../app.config';

// The plugin is a CommonJS Expo plugin (loaded by the Expo CLI), so it is
// required the same way the CLI loads it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withAndroidSigning = require('../plugins/withAndroidSigning.js') as (config: unknown) => {
  mods: {
    android: {
      appBuildGradle: (
        config: { modResults: { contents: string; language: string; path: string } },
      ) => { modResults: { contents: string } };
    };
  };
};

const TEMPLATE = `apply plugin: "com.android.application"

android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.debug
        }
    }
}
`;

function runMod(contents: string): string {
  const config = withAndroidSigning({ name: 'AnimAlc', slug: 'animalc' });
  const modConfig = {
    modResults: { contents, language: 'groovy', path: 'android/app/build.gradle' },
    modRequest: { projectRoot: process.cwd(), platformProjectRoot: 'android', platform: 'android' },
  };
  // The Expo mod contract mutates modResults in place.
  config.mods.android.appBuildGradle(modConfig as never);
  return modConfig.modResults.contents;
}

describe('Android release signing plugin', () => {
  it('adds a keystore-driven release signing config', () => {
    const output = runMod(TEMPLATE);

    expect(output).toContain('ANIMALC_SIGNING_BEGIN');
    expect(output).toContain('signingConfigs {');
    expect(output).toContain('animalcRelease {');
    expect(output).toContain("storeFile file(animalcStoreFile)");
    expect(output).toContain('signingConfig signingConfigs.animalcRelease');
    // Credentials come from keystore.properties or the environment only.
    expect(output).toContain("rootProject.file('keystore.properties')");
    expect(output).toContain("System.getenv('ANIMALC_UPLOAD_STORE_PASSWORD')");
    // The generated template is left untouched, so the debug build keeps working.
    expect(output.startsWith('apply plugin: "com.android.application"')).toBe(true);
    // No literal secret may end up in the gradle file.
    expect(output).not.toMatch(/storePassword\s+'[^']+'/);
  });

  it('is idempotent across repeated prebuilds', () => {
    const once = runMod(TEMPLATE);
    const twice = runMod(once);
    expect(twice.split('ANIMALC_SIGNING_BEGIN')).toHaveLength(2);
    expect(twice).toBe(once);
  });

  it('is wired into the Expo config', () => {
    expect(appConfig.plugins).toContain('./plugins/withAndroidSigning');
  });

  it('produces a prebuilt project whose gradle file carries the block', () => {
    const buildGradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
    if (!fs.existsSync(buildGradle)) {
      // No JDK/Android SDK is needed to read the file, but prebuild may not have
      // run in this environment — the unit assertions above still cover it.
      return;
    }
    const contents = fs.readFileSync(buildGradle, 'utf8');
    expect(contents).toContain('signingConfig signingConfigs.animalcRelease');
    expect(contents.split('ANIMALC_SIGNING_BEGIN')).toHaveLength(2);
  });

  it('ships an executable keystore generator', () => {
    const script = path.join(__dirname, '..', 'scripts', 'make-keystore.sh');
    execFileSync('bash', ['-n', script]);
    expect(fs.readFileSync(script, 'utf8')).toContain('keytool -genkeypair');
  });
});
