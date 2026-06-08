import Cocoa
import SwiftUI
import UserNotifications

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    
    var statusItem: NSStatusItem?
    var hudPanel: HUDPanel?
    
    static var shared: AppDelegate?
    
    static func main() {
        // Prevent duplicate instances if running as a bundled app
        if let bundleID = Bundle.main.bundleIdentifier {
            let runningApps = NSWorkspace.shared.runningApplications
            let isAlreadyRunning = runningApps.contains { app in
                app.bundleIdentifier == bundleID && app != NSRunningApplication.current
            }
            if isAlreadyRunning {
                print("[AxiomOS] An instance of AxiomOS is already running. Exiting duplicate process.")
                exit(0)
            }
        }
        
        let app = NSApplication.shared
        let delegate = AppDelegate()
        AppDelegate.shared = delegate // Retain strong reference to prevent deallocation in release builds
        app.delegate = delegate
        app.run()
    }
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Disable output buffering to ensure print statements are written to log files instantly
        setbuf(stdout, nil)
        setbuf(stderr, nil)
        
        // Run as background accessory application (no dock icon)
        NSApp.setActivationPolicy(.accessory)
        
        setupStatusItem()
        setupHUD()
        setupHotKeys()
        
        // Initial accessibility permission verification (silent prompt)
        _ = TextInterception.shared.checkAccessibilityAccess(prompt: false)
        
        print("[AxiomOS] Application initialized successfully as a background utility.")
        
        // Request authorization for local notifications to remind user of global hotkey
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
            if granted {
                let content = UNMutableNotificationContent()
                content.title = "✨ AxiomOS Active"
                content.body = "Press Control+Shift+Space to open the interactive HUD."
                content.sound = UNNotificationSound.default
                
                let request = UNNotificationRequest(identifier: "AxiomOSStartup", content: content, trigger: nil)
                center.add(request)
            }
        }
    }
    
    // MARK: - Menu Bar Status Item Setup
    
    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        
        guard let button = statusItem?.button else { return }
        
        // Set standard sparkles system symbol icon
        if let image = NSImage(systemSymbolName: "sparkles", accessibilityDescription: "AxiomOS") {
            image.isTemplate = true // Supports dark/light menu bars automatically
            button.image = image
        } else {
            button.title = "✨"
        }
        
        let menu = NSMenu()
        
        let titleItem = NSMenuItem(title: "AxiomOS — System Prompt Tool", action: nil, keyEquivalent: "")
        titleItem.isEnabled = false
        menu.addItem(titleItem)
        
        menu.addItem(NSMenuItem.separator())
        
        // Dynamic length submenu
        let lengthItem = NSMenuItem(title: "Default Output Length", action: nil, keyEquivalent: "")
        let lengthSubmenu = NSMenu()
        
        let lengths = ["short", "medium", "detailed"]
        for len in lengths {
            let item = NSMenuItem(title: len.capitalized, action: #selector(changeLength(_:)), keyEquivalent: "")
            item.representedObject = len
            item.state = (ConfigManager.shared.defaultLength == len) ? .on : .off
            lengthSubmenu.addItem(item)
        }
        lengthItem.submenu = lengthSubmenu
        menu.addItem(lengthItem)
        
        menu.addItem(NSMenuItem.separator())
        
        let openHUDItem = menu.addItem(withTitle: "Open HUD Panel", action: #selector(menuOpenHUD), keyEquivalent: " ")
        openHUDItem.keyEquivalentModifierMask = [.control, .shift]
        menu.addItem(withTitle: "Update Gemini API Key...", action: #selector(menuUpdateAPIKey), keyEquivalent: "")
        menu.addItem(withTitle: "Clear API Key", action: #selector(menuClearAPIKey), keyEquivalent: "")
        menu.addItem(withTitle: "Request Accessibility Access...", action: #selector(menuRequestAccessibility), keyEquivalent: "")
        
        menu.addItem(NSMenuItem.separator())
        
        menu.addItem(withTitle: "Quit AxiomOS", action: #selector(menuQuit), keyEquivalent: "q")
        
        statusItem?.menu = menu
    }
    
    @objc private func changeLength(_ sender: NSMenuItem) {
        guard let lengthVal = sender.representedObject as? String else { return }
        ConfigManager.shared.defaultLength = lengthVal
        
        // Update states in dropdown menu
        if let submenu = sender.menu {
            for item in submenu.items {
                item.state = (item.representedObject as? String == lengthVal) ? .on : .off
            }
        }
        print("[AxiomOS] Output length preference updated to: \(lengthVal)")
    }
    
    // MARK: - HUD Window Lifecycle
    
    private func setupHUD() {
        let hudView = HUDView(onClose: { [weak self] in
            self?.hideHUD()
        })
        let hostingView = NSHostingView(rootView: hudView)
        hudPanel = HUDPanel(contentView: hostingView)
    }
    
    private func showHUD(immediateActionId: String? = nil) {
        guard let panel = hudPanel else { return }
        
        // Post a notification to reset the SwiftUI state of HUDView back to idle
        NotificationCenter.default.post(name: Notification.Name("ResetHUDState"), object: nil)
        
        // Position panel relative to active mouse cursor pointer
        panel.positionNearMouseCursor()
        
        // Bring to front
        panel.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        
        // Dispatch notifications if a direct chord trigger is executed
        if let actionId = immediateActionId {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                NotificationCenter.default.post(
                    name: Notification.Name("TriggerHUDAction"),
                    object: actionId
                )
            }
        }
    }
    
    private func hideHUD() {
        hudPanel?.orderOut(nil)
    }
    
    func performReplacement(with text: String) {
        hideHUD()
        Task {
            await TextInterception.shared.replaceSelection(with: text)
        }
    }

    // Called by HUDView immediately on action selection to close the HUD
    // and hand keyboard focus back to the target editor before streaming begins.
    func beginStreamingReplacement() {
        hideHUD()
        TextInterception.shared.restorePreviousAppFocus()
    }
    
    // MARK: - Hotkey Configurations
    
    func executeSilentAction(actionId: String) {
        Task {
            print("[AxiomOS] Initiating silent direct action: \(actionId)...")
            
            // 1. Capture selection immediately (target app still has focus)
            guard let selection = await TextInterception.shared.getSelection(),
                  !selection.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                print("[AxiomOS] Silent direct action cancelled: empty text selection.")
                DispatchQueue.main.async {
                    NSSound(named: "Basso")?.play()
                }
                return
            }
            
            do {
                let modeName: String
                switch actionId {
                case "analyst": modeName = "Optimize Prompt"
                case "engineer": modeName = "Engineer Mode"
                case "proofread": modeName = "Proofread Text"
                case "rewrite": modeName = "Rewrite & Elevate"
                case "exec-summary": modeName = "Executive Summary"
                case "first-principles": modeName = "First Principles"
                case "summarize": modeName = "Summarize Text"
                default: modeName = "Optimize"
                }
                
                var streamText = ""
                TextInterception.shared.streamingModeName = modeName
                
                // 2. Query the Gemini API (stream live to editor)
                _ = try await GeminiClient.shared.optimizePrompt(
                    rawPrompt: selection,
                    modeId: actionId,
                    length: ConfigManager.shared.defaultLength,
                    onChunk: { chunk in
                        streamText += chunk
                        let snapshot = streamText
                        DispatchQueue.main.async {
                            TextInterception.shared.processStreamChunk(snapshot)
                        }
                    }
                )
                
                await TextInterception.shared.finishStreaming()
                print("[AxiomOS] Silent direct action \(actionId) completed successfully.")
                
                // 4. Glass tick sound confirms completion
                DispatchQueue.main.async {
                    NSSound(named: "Glass")?.play()
                }
            } catch {
                TextInterception.shared.abortStreaming()
                print("[AxiomOS] Silent direct action \(actionId) error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    NSSound(named: "Basso")?.play()
                }
            }
        }
    }
    
    private func setupHotKeys() {
        let manager = HotKeyManager.shared
        
        manager.onTriggerHUD = { [weak self] in
            Task {
                print("[AxiomOS Trigger] Control+Shift+Space pressed. Capturing selection...")
                let selection = await TextInterception.shared.getSelection() ?? ""
                DispatchQueue.main.async {
                    AxiomSession.shared.capturedText = selection
                    self?.showHUD()
                }
            }
        }
        
        manager.onTriggerDirectOptimize = { [weak self] in
            self?.executeSilentAction(actionId: "analyst")
        }
        
        manager.onTriggerDirectProofread = { [weak self] in
            self?.executeSilentAction(actionId: "proofread")
        }
        
        manager.onTriggerDirectRewrite = { [weak self] in
            self?.executeSilentAction(actionId: "rewrite")
        }
        
        manager.onTriggerDirectEngineer = { [weak self] in
            self?.executeSilentAction(actionId: "engineer")
        }
        
        manager.onTriggerDirectSummarize = { [weak self] in
            self?.executeSilentAction(actionId: "summarize")
        }
        
        manager.startListening()
    }
    
    // MARK: - Actions
    
    @objc private func menuOpenHUD() {
        showHUD()
    }
    
    @objc private func menuUpdateAPIKey() {
        let alert = NSAlert()
        alert.messageText = "Update Gemini API Key"
        alert.informativeText = "Please enter your Gemini API Key. It will be stored securely in the macOS Keychain."
        alert.alertStyle = .informational
        
        let secureTextField = NSSecureTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        secureTextField.placeholderString = "Enter API Key"
        
        alert.accessoryView = secureTextField
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Cancel")
        
        NSApp.activate(ignoringOtherApps: true)
        
        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            let enteredKey = secureTextField.stringValue
            if !enteredKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let success = ConfigManager.shared.updateAPIKey(enteredKey)
                if success {
                    let successAlert = NSAlert()
                    successAlert.messageText = "API Key Updated"
                    successAlert.informativeText = "Your Gemini API Key has been updated and securely stored in the macOS Keychain."
                    successAlert.alertStyle = .informational
                    successAlert.addButton(withTitle: "OK")
                    successAlert.runModal()
                } else {
                    let errorAlert = NSAlert()
                    errorAlert.messageText = "Update Failed"
                    errorAlert.informativeText = "Failed to save the Gemini API Key to the secure macOS Keychain."
                    errorAlert.alertStyle = .warning
                    errorAlert.addButton(withTitle: "OK")
                    errorAlert.runModal()
                }
            }
        }
    }
    
    @objc private func menuClearAPIKey() {
        let alert = NSAlert()
        alert.messageText = "Clear API Key"
        alert.informativeText = "Are you sure you want to clear your Gemini API Key from the secure macOS Keychain?"
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Clear")
        alert.addButton(withTitle: "Cancel")
        
        NSApp.activate(ignoringOtherApps: true)
        
        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            ConfigManager.shared.clearAPIKey()
            let successAlert = NSAlert()
            successAlert.messageText = "API Key Cleared"
            successAlert.informativeText = "Your Gemini API Key has been removed from the secure macOS Keychain."
            successAlert.alertStyle = .informational
            successAlert.addButton(withTitle: "OK")
            successAlert.runModal()
        }
    }
    
    @objc private func menuRequestAccessibility() {
        let trusted = TextInterception.shared.checkAccessibilityAccess(prompt: true)
        if trusted {
            let alert = NSAlert()
            alert.messageText = "Accessibility Approved"
            alert.informativeText = "AxiomOS already has Accessibility permissions active. You're ready to optimize text anywhere!"
            alert.alertStyle = .informational
            alert.addButton(withTitle: "OK")
            alert.runModal()
        }
    }
    
    @objc private func menuQuit() {
        NSApplication.shared.terminate(nil)
    }
}

class AxiomSession: ObservableObject {
    static let shared = AxiomSession()
    @Published var capturedText: String = ""
    private init() {}
}
