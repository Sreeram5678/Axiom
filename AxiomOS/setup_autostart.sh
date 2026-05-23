#!/bin/bash

# setup_autostart.sh
# Automates macOS Launch Agent setup for AxiomOS

PLIST_NAME="com.axiom.axiomos.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY_PATH="$SCRIPT_DIR/.build/release/axiomos"

# Direct output colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function show_usage() {
    echo "Usage: ./setup_autostart.sh [setup|uninstall]"
    echo "  setup      - Compiles AxiomOS and registers the Launch Agent to launch on login"
    echo "  uninstall  - Unregisters and deletes the Launch Agent configuration"
}

if [ "$1" != "setup" ] && [ "$1" != "uninstall" ]; then
    show_usage
    exit 1
fi

if [ "$1" == "setup" ]; then
    echo -e "${GREEN}[AxiomOS Auto-Start] Compiling Swift binary in release mode...${NC}"
    cd "$SCRIPT_DIR" || exit 1
    
    # Run release compilation
    swift build -c release
    
    if [ ! -f "$BINARY_PATH" ]; then
        echo -e "${RED}[AxiomOS Auto-Start] Compilation failed. Binary not found at $BINARY_PATH${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}[AxiomOS Auto-Start] Swift build successful! creating Launch Agent configuration...${NC}"
    
    # Create LaunchAgents directory if missing
    mkdir -p "$HOME/Library/LaunchAgents"
    
    # Generate plist content
    cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.axiom.axiomos</string>
    <key>ProgramArguments</key>
    <array>
        <string>$BINARY_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

    echo -e "${GREEN}[AxiomOS Auto-Start] Launch Agent plist created at $PLIST_PATH${NC}"
    
    # Register / Boot Launch Agent
    echo -e "${GREEN}[AxiomOS Auto-Start] Registering with launchctl...${NC}"
    
    # Unload first just in case it is already loaded
    launchctl bootout "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null
    launchctl unload "$PLIST_PATH" 2>/dev/null
    
    # Bootstrap using modern macOS API, fallback to load if needed
    if launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null; then
        echo -e "${GREEN}[AxiomOS Auto-Start] Auto-start configured successfully! AxiomOS will launch on next login.${NC}"
    elif launchctl load "$PLIST_PATH" 2>/dev/null; then
        echo -e "${GREEN}[AxiomOS Auto-Start] Auto-start configured successfully! AxiomOS will launch on next login.${NC}"
    else
        echo -e "${RED}[AxiomOS Auto-Start] Warning: Registered Launch Agent, but failed to immediately load it. It will still trigger on system restart.${NC}"
    fi

elif [ "$1" == "uninstall" ]; then
    echo -e "${GREEN}[AxiomOS Auto-Start] Unregistering and removing Launch Agent...${NC}"
    
    # Unload daemon
    launchctl bootout "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null
    launchctl unload "$PLIST_PATH" 2>/dev/null
    
    # Delete plist
    if [ -f "$PLIST_PATH" ]; then
        rm -f "$PLIST_PATH"
        echo -e "${GREEN}[AxiomOS Auto-Start] Plist removed. Auto-start uninstalled successfully.${NC}"
    else
        echo -e "${RED}[AxiomOS Auto-Start] Launch Agent plist was not found at $PLIST_PATH.${NC}"
    fi
fi
