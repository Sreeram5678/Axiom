#!/bin/bash

# Launch_AxiomOS.command
# Double-click this file in macOS Finder to start AxiomOS in the background.

# 1. Close any running instances to prevent duplicates
killall axiomos 2>/dev/null || true

# 2. Launch the Swift binary in the background
"/Users/sreeramlagisetty/Desktop/Axiom/AxiomOS/.build/release/axiomos" > /dev/null 2>&1 &

# 3. Terminate/close the terminal window that popped up
osascript -e 'tell application "Terminal" to close (every window whose name contains "Launch_AxiomOS.command")' &

exit 0
