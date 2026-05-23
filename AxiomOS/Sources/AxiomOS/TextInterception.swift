import Cocoa
import ApplicationServices

class TextInterception {
    static let shared = TextInterception()
    
    private init() {}
    
    func checkAccessibilityAccess(prompt: Bool = false) -> Bool {
        if prompt {
            let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
            return AXIsProcessTrustedWithOptions(options as CFDictionary)
        } else {
            return AXIsProcessTrusted()
        }
    }
    
    func getFocusedElement() -> AXUIElement? {
        let systemWide = AXUIElementCreateSystemWide()
        var focusedElement: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(systemWide, kAXFocusedUIElementAttribute as CFString, &focusedElement)
        
        if result == .success, let element = focusedElement {
            return (element as! AXUIElement)
        }
        return nil
    }
    
    func getAccessibilitySelectedText(from element: AXUIElement) -> String? {
        var selectedText: CFTypeRef?
        let resultAttr = AXUIElementCopyAttributeValue(element, kAXSelectedTextAttribute as CFString, &selectedText)
        if resultAttr == .success, let text = selectedText as? String {
            return text
        }
        return nil
    }
    
    func setAccessibilitySelectedText(on element: AXUIElement, to newValue: String) -> Bool {
        let result = AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, newValue as CFTypeRef)
        return result == .success
    }
    
    // Core Entry: Gets text selection using hybrid mechanics
    func getSelection() async -> String? {
        // 1. Accessibility Attempt
        if let focusedElement = getFocusedElement() {
            if let selectedText = getAccessibilitySelectedText(from: focusedElement), !selectedText.isEmpty {
                print("[AxiomOS Intercept] Successfully extracted selected text via Accessibility APIs")
                return selectedText
            }
        }
        
        // 2. Clipboard Fallback
        print("[AxiomOS Intercept] Accessibility selection unavailable. Invoking Clipboard simulation...")
        return await getSelectionViaClipboard()
    }
    
    // Core Entry: Replaces selection using hybrid mechanics
    func replaceSelection(with newValue: String) async {
        // 1. Accessibility Attempt
        if let focusedElement = getFocusedElement() {
            if setAccessibilitySelectedText(on: focusedElement, to: newValue) {
                print("[AxiomOS Intercept] Successfully replaced selected text via Accessibility APIs")
                return
            }
        }
        
        // 2. Clipboard Fallback
        print("[AxiomOS Intercept] Accessibility replacement unavailable. Invoking Clipboard paste...")
        await replaceSelectionViaClipboard(with: newValue)
    }
    
    // MARK: - Clipboard Simulation Details
    
    private func getSelectionViaClipboard() async -> String? {
        let pasteboard = NSPasteboard.general
        let previousString = pasteboard.string(forType: .string) ?? ""
        
        pasteboard.clearContents()
        
        simulateCopy()
        
        // Dynamic wait loop for target window pasteboard response (up to 150ms)
        for _ in 0..<15 {
            try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
            if let currentText = pasteboard.string(forType: .string), !currentText.isEmpty {
                let copiedText = currentText
                // Restore original clipboard
                pasteboard.clearContents()
                pasteboard.setString(previousString, forType: .string)
                return copiedText
            }
        }
        
        // Restore previous copy if operation timed out
        if !previousString.isEmpty {
            pasteboard.clearContents()
            pasteboard.setString(previousString, forType: .string)
        }
        return nil
    }
    
    private func replaceSelectionViaClipboard(with newValue: String) async {
        let pasteboard = NSPasteboard.general
        let previousString = pasteboard.string(forType: .string) ?? ""
        
        pasteboard.clearContents()
        pasteboard.setString(newValue, forType: .string)
        
        simulatePaste()
        
        // Retain selection briefly for active compositor paste queue to execute
        try? await Task.sleep(nanoseconds: 150_000_000) // 150ms
        
        // Restore original clipboard
        pasteboard.clearContents()
        pasteboard.setString(previousString, forType: .string)
    }
    
    private func simulateCopy() {
        let source = CGEventSource(stateID: .combinedSessionState)
        
        let cVirtualKey: CGKeyCode = 8 // 'C' key on standard QWERTY
        
        let cDown = CGEvent(keyboardEventSource: source, virtualKey: cVirtualKey, keyDown: true)
        cDown?.flags = .maskCommand
        let cUp = CGEvent(keyboardEventSource: source, virtualKey: cVirtualKey, keyDown: false)
        cUp?.flags = .maskCommand
        
        cDown?.post(tap: .cghidEventTap)
        cUp?.post(tap: .cghidEventTap)
    }
    
    private func simulatePaste() {
        let source = CGEventSource(stateID: .combinedSessionState)
        
        let vVirtualKey: CGKeyCode = 9 // 'V' key on standard QWERTY
        
        let vDown = CGEvent(keyboardEventSource: source, virtualKey: vVirtualKey, keyDown: true)
        vDown?.flags = .maskCommand
        let vUp = CGEvent(keyboardEventSource: source, virtualKey: vVirtualKey, keyDown: false)
        vUp?.flags = .maskCommand
        
        vDown?.post(tap: .cghidEventTap)
        vUp?.post(tap: .cghidEventTap)
    }
}
