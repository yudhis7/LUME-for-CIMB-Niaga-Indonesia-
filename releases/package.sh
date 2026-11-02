#!/usr/bin/env bash
# Packages desktop/build output into releases/<version>/ (run after desktop/build.sh).
set -euo pipefail
cd "$(dirname "$0")/.."
V="${1:-v1.0.0}"; R="releases/$V"; mkdir -p "$R"
T=$(mktemp -d)
cp "desktop/build/win/Lume for CIMB Niaga.exe" "$R/Lume-for-CIMB-Niaga.exe"
cp "desktop/build/win/Lume for CIMB Niaga.exe" "$T/"
cp "$R/INSTALL.txt" "$T/README - Install.txt"
(cd "$T" && zip -q -X win.zip "Lume for CIMB Niaga.exe" "README - Install.txt")
(cd desktop/build/mac && zip -q -r -X -y "$T/mac.zip" "Lume for CIMB Niaga.app")
(cd "$T" && zip -q -X mac.zip "README - Install.txt")
mv "$T/win.zip" "$R/Lume-for-CIMB-Niaga-Windows.zip"; mv "$T/mac.zip" "$R/Lume-for-CIMB-Niaga-macOS.zip"
rm -rf "$T"; ls -la "$R"
