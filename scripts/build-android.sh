#!/usr/bin/env bash
# One-command signed Android build for installing on a real device.
#
#   ./scripts/build-android.sh
#
# What it does:
#   1. creates animalc-release.keystore if it does not exist yet (prompts for a
#      password; nothing is written to the repository);
#   2. exports the ANIMALC_UPLOAD_* variables the signing plugin reads;
#   3. runs `expo prebuild` (regenerating android/ and injecting the signing
#      config) and `./gradlew assembleRelease`;
#   4. verifies the signature with apksigner when the Android SDK is present;
#   5. prints the absolute path of the installable APK.
#
# Set ANIMALC_UPLOAD_STORE_PASSWORD / ANIMALC_UPLOAD_KEY_PASSWORD beforehand to
# run non-interactively (that is what CI does).
set -euo pipefail

ROOT="$PWD"
KEYSTORE="${ANIMALC_UPLOAD_STORE_FILE:-$ROOT/animalc-release.keystore}"
ALIAS="${ANIMALC_UPLOAD_KEY_ALIAS:-animalc}"
STORE_PASSWORD="${ANIMALC_UPLOAD_STORE_PASSWORD:-}"
KEY_PASSWORD="${ANIMALC_UPLOAD_KEY_PASSWORD:-}"

if [ ! -f "$KEYSTORE" ]; then
  if ! command -v keytool >/dev/null 2>&1; then
    echo "keytool was not found — install a JDK (17+) first." >&2
    exit 1
  fi
  if [ -z "$STORE_PASSWORD" ]; then
    read -r -s -p "Keystore password: " STORE_PASSWORD
    echo
  fi
  [ -n "$KEY_PASSWORD" ] || KEY_PASSWORD="$STORE_PASSWORD"
  echo "Creating $KEYSTORE (alias: $ALIAS)."
  export ANIMALC_STORE_PASS="$STORE_PASSWORD"
  export ANIMALC_KEY_PASS="$KEY_PASSWORD"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias "$ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10950 \
    -storepass:env ANIMALC_STORE_PASS \
    -keypass:env ANIMALC_KEY_PASS
  chmod 600 "$KEYSTORE"
  unset ANIMALC_STORE_PASS ANIMALC_KEY_PASS
fi

if [ -z "$STORE_PASSWORD" ]; then
  echo "ANIMALC_UPLOAD_STORE_PASSWORD is required for the existing keystore at $KEYSTORE" >&2
  exit 1
fi
[ -n "$KEY_PASSWORD" ] || KEY_PASSWORD="$STORE_PASSWORD"

export ANIMALC_UPLOAD_STORE_FILE="$KEYSTORE"
export ANIMALC_UPLOAD_STORE_PASSWORD="$STORE_PASSWORD"
export ANIMALC_UPLOAD_KEY_ALIAS="$ALIAS"
export ANIMALC_UPLOAD_KEY_PASSWORD="$KEY_PASSWORD"

echo "→ expo prebuild (regenerates android/ and injects the release signing config)"
npx expo prebuild -p android --clean

echo "→ gradlew assembleRelease"
cd "$ROOT/android"
chmod +x gradlew
./gradlew assembleRelease --no-daemon

APK="$(find app/build/outputs/apk/release -name '*.apk' | head -n 1)"
if [ -z "$APK" ]; then
  echo "The build finished but no APK was found under app/build/outputs/apk/release." >&2
  exit 1
fi

BUILD_TOOLS=""
if [ -n "${ANDROID_HOME:-}" ]; then
  BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/* 2>/dev/null | sort -V | tail -n 1 || true)"
fi
if [ -n "$BUILD_TOOLS" ] && [ -x "$BUILD_TOOLS/apksigner" ]; then
  echo "→ apksigner verify"
  "$BUILD_TOOLS/apksigner" verify --print-certs "$APK"
else
  echo "apksigner was not found (ANDROID_HOME is unset) — skipping signature verification."
fi

echo
echo "Signed, installable APK:"
echo "  $ROOT/android/$APK"
echo "Install with: adb install -r \"$ROOT/android/$APK\""
