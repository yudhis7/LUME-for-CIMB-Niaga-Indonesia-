#!/usr/bin/env bash
# Builds Lume for CIMB Niaga for Windows (x64) and macOS (universal).
# Needs Go 1.22+, Python 3 and (for macOS ad-hoc signing on Linux) rcodesign.
# The web console lives in web/index.html; replace it to ship a new version.
set -euo pipefail
cd "$(dirname "$0")"
export CGO_ENABLED=0
VER=1.0.0
APP="build/mac/Lume for CIMB Niaga.app"

# Use the latest web build if the web/ folder sits next to this one.
[ -f ../web/dist/lume-cimb-niaga.html ] && cp ../web/dist/lume-cimb-niaga.html web/index.html

# Windows: icon + manifest resources, then a GUI (no console) executable.
rsrc -arch amd64 -manifest assets/app.manifest -ico assets/icon.ico -o rsrc_windows_amd64.syso
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H windowsgui -s -w" -o "build/win/Lume for CIMB Niaga.exe" .

# macOS: one binary per architecture, merged into a universal app bundle.
GOOS=darwin GOARCH=arm64 go build -trimpath -ldflags "-s -w" -o build/mac/Lume-arm64 .
GOOS=darwin GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o build/mac/Lume-amd64 .
rm -rf "$APP"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Frameworks" "$APP/Contents/Resources"
python3 tools_lipo.py "$APP/Contents/MacOS/Lume" build/mac/Lume-amd64 build/mac/Lume-arm64
python3 tools_lipo.py "$APP/Contents/Frameworks/libwebview.dylib" native/darwin/amd64/libwebview.dylib native/darwin/arm64/libwebview.dylib
chmod 755 "$APP/Contents/MacOS/Lume"
cp assets/Info.plist "$APP/Contents/Info.plist"
cp assets/icon.icns "$APP/Contents/Resources/AppIcon.icns"
printf 'APPL????' > "$APP/Contents/PkgInfo"

# Ad-hoc signature (lets macOS show "Open Anyway"). For distribution without
# warnings, sign on a Mac with a Developer ID and notarize instead:
#   codesign --deep --force --options runtime --sign "Developer ID Application: <Team>" "$APP"
#   xcrun notarytool submit Lume.zip --keychain-profile <profile> --wait && xcrun stapler staple "$APP"
# (with the hardened runtime, add the entitlement com.apple.security.cs.disable-library-validation
#  or sign libwebview.dylib with the same Developer ID).
rcodesign sign "$APP"
echo "Built $VER"
