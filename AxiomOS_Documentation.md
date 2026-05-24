# AxiomOS — Native macOS Companion Application Documentation

AxiomOS is a native, background-accessory menu-bar utility for macOS that intercepts selected text system-wide, overlays a glassmorphic HUD panel, and performs in-place text optimization in any editor (such as Xcode, VS Code, Notes, Slack, or browsers) using Google Gemini.

---

## 🚀 Lifecycle: How to Start and Quit AxiomOS

Because AxiomOS runs as a lightweight menu bar accessory (`NSApp.setActivationPolicy(.accessory)`), it has no dock icon and stays out of your way until called. 

### Method 1: Double-Click Launcher (Easiest Manual Startup)
We have created a double-clickable shortcut script: [Launch_AxiomOS.command](file:///Users/sreeramlagisetty/Desktop/Axiom/AxiomOS/Launch_AxiomOS.command).
1. Double-click **`Launch_AxiomOS.command`** in macOS Finder.
2. It will instantly start the background process, verify there are no duplicate instances, and automatically close its own terminal window.
3. *Tip: You can copy or drag this file to your **Desktop**, **Applications folder**, or pin it to your **Dock** for 1-click startup anytime.*

### Method 2: Configure Auto-Start (Launch on Login)
To have AxiomOS start automatically whenever you turn on or restart your Mac:
1. Open Terminal and navigate to the `AxiomOS` directory.
2. Run the helper setup script:
   ```bash
   cd /Users/sreeramlagisetty/Desktop/Axiom/AxiomOS
   ./setup_autostart.sh setup
   ```
3. This creates a lightweight macOS Launch Agent plist at `~/Library/LaunchAgents/com.axiom.axiomos.plist` and registers it with the system daemon manager (`launchd`).
4. To disable auto-start, simply run:
   ```bash
   ./setup_autostart.sh uninstall
   ```
> [!NOTE]
> **Quit-Friendly Design:** The Launch Agent configuration has `KeepAlive` set to `false`. This means if you choose to **Quit** the app during your session, it will stay closed until your next system reboot or login.

### Method 3: Command Line Manual Startup
Run the compiled binary directly from your terminal:
```bash
/Users/sreeramlagisetty/Desktop/Axiom/bin/axiomos &
```


---

## 🛑 How to Quit AxiomOS
To quit the application and stop it from running in the background:
1. Click the status icon (✨ sparkles symbol) in your macOS menu bar at the top right of your screen.
2. Select **Quit AxiomOS** (or press `Cmd+Q` while the dropdown menu is focused).
3. If you ever have stale/duplicate instances running in the background, you can kill them instantly in Terminal with:
   ```bash
   killall axiomos
   ```

---

## ⚡ System Performance & Resource Footprint

Unlike Electron-based desktop utilities which typically consume hundreds of megabytes of RAM, AxiomOS is written in **100% native Swift, SwiftUI, and AppKit**, making it extremely lightweight:

*   **Memory (RAM) Footprint**: 
    *   **Idle**: **~30 MB** (resting state, sitting silently in the menu bar).
    *   **Active HUD & Streaming**: **~52 MB – ~58 MB** (when rendering the glassmorphic overlay and receiving live AI streaming tokens).
*   **CPU Overhead**: 
    *   **Idle**: **0.0%** (utilizes OS-level Carbon event hooks, completely sleeping and consuming zero CPU clock cycles until key triggers are received).

---

## ⌨️ Global Shortcuts Cheat Sheet

Highlight any text in any editor, then press one of the following key combinations:

| Keyboard Shortcut | Mode | Description |
| :--- | :--- | :--- |
| `Control+Shift+Space` | **Interactive HUD** | Captures text and opens a beautiful glassmorphic action menu under your mouse pointer. |
| `Control+Shift+O` | **Direct Optimize** | Instantly optimizes the highlighted prompt using the default analyst persona. |
| `Control+Shift+P` | **Direct Proofread** | Corrects grammar, spelling, and punctuation without altering original style. |
| `Control+Shift+R` | **Direct Rewrite** | Upgrades vocabulary, improves readability, and polishes flow. |
| `Control+Shift+S` | **Direct Summarize** | Condenses highlighted text into core facts. |
| `Control+Shift+E` | **Executive Summary** | Extracts a 2-sentence synthesis and 3-5 bulleted takeaways. |

---

## 🔑 Permissions & Trust
Because AxiomOS performs system-wide text replacement, it requires macOS **Accessibility Access** to write text back in-place:
1. Go to **System Settings > Privacy & Security > Accessibility**.
2. Toggle the switch next to **AxiomOS** (or your Terminal app if launching from command line) to **ON**.
3. You can verify your access status at any time by clicking the status menu icon and selecting **Request Accessibility Access...**.
