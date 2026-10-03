#!/usr/bin/env bash
# Generates the AnimAlc Android release keystore and prints the values that go
# into CI secrets. Run it once, keep the file safe (offline backup!) and never
# commit it — .gitignore already excludes *.keystore.
#
#   ./scripts/make-keystore.sh [alias] [output-file]
#
# Losing the keystore means the app can never be updated again, so back it up.
set -euo pipefail

ALIAS="${1:-animalc}"
OUT="${2:-animalc-release.keystore}"
VALIDITY_DAYS="${VALIDITY_DAYS:-10950}" # ~30 years: Play requires a long-lived key

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool was not found. Install a JDK (17+) first." >&2
  exit 1
fi

if [ -e "$OUT" ]; then
  echo "Refusing to overwrite the existing keystore at $OUT" >&2
  exit 1
fi

echo "Generating $OUT (alias: $ALIAS, validity: ${VALIDITY_DAYS} days)."
echo "keytool will ask for a store password and key details — nothing is stored in history."
keytool -genkeypair -v \
  -keystore "$OUT" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS"

chmod 600 "$OUT"

echo
echo "Keystore created: $OUT"
echo
echo "1) Back the file up somewhere offline."
echo "2) Put the file contents into the CI secret ANDROID_KEYSTORE_BASE64:"
if base64 --help 2>&1 | grep -q -- '-w'; then
  echo "     base64 -w0 $OUT | pbcopy        # or: base64 -w0 $OUT"
else
  echo "     base64 -i $OUT | pbcopy         # or: base64 -i $OUT"
fi
echo "3) Set the remaining secrets: ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS ($ALIAS), ANDROID_KEY_PASSWORD."
echo "4) Build with: npx expo prebuild -p android --clean && cd android && ./gradlew assembleRelease"
echo "   (export ANIMALC_UPLOAD_STORE_FILE / _STORE_PASSWORD / _KEY_ALIAS / _KEY_PASSWORD first,"
echo "    or write android/keystore.properties with storeFile, storePassword, keyAlias, keyPassword.)"
