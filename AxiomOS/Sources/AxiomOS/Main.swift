import Cocoa
import SwiftUI

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    
    var statusItem: NSStatusItem?
    var hudPanel: HUDPanel?
    
    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.run()
    }
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Run as background accessory application (no dock icon)
        NSApp.setActivationPolicy(.accessory)
        
        setupStatusItem()
        setupHUD()
        setupHotKeys()
        
        // Initial accessibility permission verification (silent prompt)
        _ = TextInterception.shared.checkAccessibilityAccess(prompt: false)
        
        print("[AxiomOS] Application initialized successfully as a background utility.")
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
        
        menu.addItem(withTitle: "Open HUD Panel (⌃⇧Space)", action: #selector(menuOpenHUD), keyEquivalent: "")
        menu.addItem(withTitle: "Edit Config File (~/.axiom_config.json)", action: #selector(menuEditConfig), keyEquivalent: "")
        menu.addItem(withTitle: "Request Accessibility Access...", action: #selector(menuRequestAccessibility), keyEquivalent: "")
        
        menu.addItem(NSMenuItem.separator())
        
        menu.addItem(withTitle: "Quit AxiomOS", action: #selector(menuQuit), keyEquivalent: "q")
        
        statusItem?.menu = menu
    }
    
    @objc private func changeLength(_ sender: NSMenuItem) {
        guard let lengthVal = sender.representedObject as? String else { return }
        // Set new default length in model configuration
        // In this simple architecture we write config data directly
        let model = ConfigModel(
            apiKey: ConfigManager.shared.apiKey,
            defaultLength: lengthVal,
            selectedModeId: ConfigManager.shared.selectedModeId
        )
        // Re-save config
        let configFileURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".axiom_config.json")
        if let data = try? JSONEncoder().encode(model) {
            try? data.write(to: configFileURL)
        }
        ConfigManager.shared.loadConfig() // Reload
        
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
        // Wait 150ms for target window focus restoration before writing selection back
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            Task {
                await TextInterception.shared.replaceSelection(with: text)
            }
        }
    }
    
    // MARK: - Hotkey Configurations
    
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
            Task {
                print("[AxiomOS Trigger] Direct Control+Shift+O pressed. Capturing selection...")
                let selection = await TextInterception.shared.getSelection() ?? ""
                DispatchQueue.main.async {
                    AxiomSession.shared.capturedText = selection
                    self?.showHUD(immediateActionId: "analyst")
                }
            }
        }
        
        manager.onTriggerDirectProofread = { [weak self] in
            Task {
                print("[AxiomOS Trigger] Direct Control+Shift+P pressed. Capturing selection...")
                let selection = await TextInterception.shared.getSelection() ?? ""
                DispatchQueue.main.async {
                    AxiomSession.shared.capturedText = selection
                    self?.showHUD(immediateActionId: "proofread")
                }
            }
        }
        
        manager.onTriggerDirectRewrite = { [weak self] in
            Task {
                print("[AxiomOS Trigger] Direct Control+Shift+R pressed. Capturing selection...")
                let selection = await TextInterception.shared.getSelection() ?? ""
                DispatchQueue.main.async {
                    AxiomSession.shared.capturedText = selection
                    self?.showHUD(immediateActionId: "rewrite")
                }
            }
        }
        
        manager.startListening()
    }
    
    // MARK: - Actions
    
    @objc private func menuOpenHUD() {
        showHUD()
    }
    
    @objc private func menuEditConfig() {
        let homeDir = FileManager.default.homeDirectoryForCurrentUser
        let configURL = homeDir.appendingPathComponent(".axiom_config.json")
        NSWorkspace.shared.open(configURL)
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
