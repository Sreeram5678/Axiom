#!/usr/bin/env bash

# Exit immediately if any command exits with a non-zero status
set -e

# Define directories
WORKSPACE_DIR="/Users/sreeramlagisetty/Desktop/Axiom"
SRC_DIR="${WORKSPACE_DIR}/AxiomOS"
BIN_DIR="${WORKSPACE_DIR}/bin"
APP_DIR="${BIN_DIR}/AxiomOS.app"
ICON_MASTER="${WORKSPACE_DIR}/icons/Background.png"

# Output colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[AxiomOS Build] Packaging native macOS companion app...${NC}"

# 1. Compile the Swift binary in release mode
echo -e "${BLUE}[AxiomOS Build] Compiling Swift binary in release mode...${NC}"
cd "${SRC_DIR}"

# Run release compilation in a non-synced scratch directory to prevent iCloud database locks
rm -rf /tmp/AxiomOS-build
swift build -c release --scratch-path /tmp/AxiomOS-build

# 2. Package App Bundle
echo -e "${BLUE}[AxiomOS Build] Creating .app bundle structure...${NC}"
rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources"

# Copy binary to Bundle
cp /tmp/AxiomOS-build/release/axiomos "${APP_DIR}/Contents/MacOS/AxiomOS"
chmod +x "${APP_DIR}/Contents/MacOS/AxiomOS"

# 3. Create Info.plist
echo -e "${BLUE}[AxiomOS Build] Generating Info.plist...${NC}"
cat <<EOF > "${APP_DIR}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AxiomOS</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.axiom.axiomos</string>
    <key>CFBundleName</key>
    <string>AxiomOS</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

# 4. Generate App Icon (.icns)
if [ -f "${ICON_MASTER}" ]; then
    echo -e "${BLUE}[AxiomOS Build] Generating high-resolution Retina icon (.icns) from Master Logo...${NC}"
    ICONSET_DIR="/tmp/AxiomOS.iconset"
    rm -rf "${ICONSET_DIR}"
    mkdir -p "${ICONSET_DIR}"

    # Generate all required PNG sizes using sips
    sips -z 16 16     "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_16x16.png" > /dev/null 2>&1
    sips -z 32 32     "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_16x16@2x.png" > /dev/null 2>&1
    sips -z 32 32     "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_32x32.png" > /dev/null 2>&1
    sips -z 64 64     "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_32x32@2x.png" > /dev/null 2>&1
    sips -z 128 128   "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_128x128.png" > /dev/null 2>&1
    sips -z 256 256   "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_128x128@2x.png" > /dev/null 2>&1
    sips -z 256 256   "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_256x256.png" > /dev/null 2>&1
    sips -z 512 512   "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_256x256@2x.png" > /dev/null 2>&1
    sips -z 512 512   "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_512x512.png" > /dev/null 2>&1
    sips -z 1024 1024 "${ICON_MASTER}" --out "${ICONSET_DIR}/icon_512x512@2x.png" > /dev/null 2>&1

    # Package them into standard Apple icns file
    iconutil -c icns "${ICONSET_DIR}" -o "${APP_DIR}/Contents/Resources/AppIcon.icns"
    rm -rf "${ICONSET_DIR}"
    echo -e "${GREEN}[AxiomOS Build] Retina App icon generated successfully!${NC}"
else
    echo -e "${BLUE}[AxiomOS Build] Master icon not found at ${ICON_MASTER}. Skipping icon integration.${NC}"
fi

# 5. Ad-hoc sign the App Bundle to seal Info.plist and resources
echo -e "${BLUE}[AxiomOS Build] Ad-hoc signing the App Bundle...${NC}"
codesign --force --deep --sign - "${APP_DIR}"
echo -e "${GREEN}[AxiomOS Build] Bundle codesigned successfully!${NC}"

echo -e "${GREEN}[AxiomOS Build] SUCCESS! Native macOS application created at ${APP_DIR}${NC}"
