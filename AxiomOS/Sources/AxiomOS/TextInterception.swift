import Cocoa
import ApplicationServices

class TextInterception {
    static let shared = TextInterception()
    
    private var previouslyActiveApp: NSRunningApplication?
    private var cachedFocusedElement: AXUIElement?

    // MARK: - Streaming State
    var streamingModeName: String = "Optimize"
    private var streamingElement: AXUIElement? = nil
    private var streamingStartIndex: Int = 0
    private var streamingWrittenLength: Int = 0
    private var streamingAXRangeSupported: Bool = false
    private var streamingIsActive: Bool = false
    private var streamingFallbackText: String = ""
    private var cachedSelectionRange: CFRange? = nil
    private var streamingFocusLost: Bool = false
    
    private init() {}
    
    func clearCache() {
        previouslyActiveApp = nil
        cachedFocusedElement = nil
        cachedSelectionRange = nil
    }

    // Expose focus restore for the HUD-close streaming path
    func restorePreviousAppFocus() {
        previouslyActiveApp?.activate(options: [.activateIgnoringOtherApps])
    }

    // MARK: - Stream Chunk Writer (call on main thread)
    // Writes the first chunk immediately by capturing the live AX selection range,
    // then re-selects and extends the previously written text on every subsequent chunk.
    func processStreamChunk(_ fullAccumulatedText: String) {
        streamingFallbackText = fullAccumulatedText

        if !streamingIsActive {
            streamingIsActive = true
            streamingFocusLost = false

            // Use element cached during getSelection(), or query fresh
            let el = cachedFocusedElement ?? getFocusedElement()
            guard let element = el else {
                print("[AxiomOS Streamer] No accessible element found. Activating Persistent Mini Result HUD immediately.")
                streamingElement = nil
                triggerHUDForFocusOrAXLoss(fullAccumulatedText)
                return
            }
            streamingElement = element

            // Restore the selection range on element before doing the first write
            if var range = cachedSelectionRange {
                if let rangeVal = AXValueCreate(.cfRange, &range) {
                    let restoreResult = AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, rangeVal)
                    print("[AxiomOS Streamer] Restored selection range on element: result=\(restoreResult)")
                }
            }

            // Capture the current selection range to record the insertion start position
            var rangeRef: CFTypeRef?
            if AXUIElementCopyAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, &rangeRef) == .success,
               let axVal = rangeRef {
                var cfRange = CFRange()
                if AXValueGetValue((axVal as! AXValue), .cfRange, &cfRange) {
                    streamingStartIndex = cfRange.location
                    // Replace the selection with the first chunk
                    if AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, fullAccumulatedText as CFTypeRef) == .success {
                        streamingWrittenLength = fullAccumulatedText.count
                        streamingAXRangeSupported = true
                        print("[AxiomOS Streamer] First chunk written via AX with range tracking at index \(streamingStartIndex).")
                        return
                    }
                }
            }

            // Range not supported — try plain attribute write (no incremental tracking)
            if AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, fullAccumulatedText as CFTypeRef) == .success {
                streamingWrittenLength = fullAccumulatedText.count
                streamingAXRangeSupported = false
                print("[AxiomOS Streamer] First chunk written via AX (no range tracking).")
            } else {
                print("[AxiomOS Streamer] AX write failed on first chunk. Activating Persistent Mini Result HUD.")
                streamingElement = nil
                triggerHUDForFocusOrAXLoss(fullAccumulatedText)
            }

        } else {
            // Check if the user has switched focus to a different application mid-stream
            if let previouslyActiveApp = previouslyActiveApp,
               NSWorkspace.shared.frontmostApplication != previouslyActiveApp {
                triggerHUDForFocusOrAXLoss(fullAccumulatedText)
            }

            if streamingFocusLost || streamingElement == nil {
                // If focus is lost or AX is unsupported, route chunk live to the Mini HUD instead of the editor
                DispatchQueue.main.async {
                    StreamResultHUDManager.shared.updateText(fullAccumulatedText)
                }
                return
            }

            guard let element = streamingElement else { return }

            if streamingAXRangeSupported {
                // Re-select the text we previously wrote, then replace with the extended accumulation
                var cfRange = CFRange(location: streamingStartIndex, length: streamingWrittenLength)
                if let rangeVal = AXValueCreate(.cfRange, &cfRange) {
                    AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, rangeVal)
                    AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, fullAccumulatedText as CFTypeRef)
                    streamingWrittenLength = fullAccumulatedText.count
                }
            } else {
                // Best-effort: just overwrite selected text
                AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, fullAccumulatedText as CFTypeRef)
            }
        }
    }

    private func triggerHUDForFocusOrAXLoss(_ accumulatedText: String) {
        if !streamingFocusLost {
            streamingFocusLost = true
            print("[AxiomOS Streamer] Redirecting stream to Persistent Mini Result HUD.")
            DispatchQueue.main.async {
                StreamResultHUDManager.shared.show(modeName: self.streamingModeName)
                StreamResultHUDManager.shared.updateText(accumulatedText)
            }
        }
    }

    // Call after the stream ends. Uses clipboard paste for apps that blocked AX writes.
    func finishStreaming() async {
        let focusLost = streamingFocusLost || streamingElement == nil
        let fallback = streamingFallbackText
        resetStreamingState()
        
        if focusLost && !fallback.isEmpty {
            DispatchQueue.main.async {
                StreamResultHUDManager.shared.completeText(fallback)
            }
        } else if !fallback.isEmpty {
            print("[AxiomOS Streamer] AX path succeeded directly in editor.")
        }
    }

    // Call on error to clean up without side effects.
    func abortStreaming() {
        print("[AxiomOS Streamer] Stream aborted. Cleaning up state.")
        let focusLost = streamingFocusLost || streamingElement == nil
        resetStreamingState()
        if focusLost {
            DispatchQueue.main.async {
                StreamResultHUDManager.shared.close()
            }
        }
    }

    private func resetStreamingState() {
        streamingElement = nil
        streamingStartIndex = 0
        streamingWrittenLength = 0
        streamingAXRangeSupported = false
        streamingIsActive = false
        streamingFallbackText = ""
        cachedSelectionRange = nil
        streamingFocusLost = false
    }
    
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
        clearCache()
        
        // Save the active application before capturing or losing focus
        previouslyActiveApp = NSWorkspace.shared.frontmostApplication
        print("[AxiomOS Intercept] Captured active application: \(previouslyActiveApp?.localizedName ?? "Unknown")")
        
        // 1. Accessibility Attempt
        if let focusedElement = getFocusedElement() {
            cachedFocusedElement = focusedElement
            
            // Cache selection range to restore it later if focus/selection is lost when HUD opens
            var rangeRef: CFTypeRef?
            if AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextRangeAttribute as CFString, &rangeRef) == .success,
               let axVal = rangeRef {
                var cfRange = CFRange()
                if AXValueGetValue((axVal as! AXValue), .cfRange, &cfRange) {
                    cachedSelectionRange = cfRange
                    print("[AxiomOS Intercept] Cached selection range: location=\(cfRange.location), length=\(cfRange.length)")
                }
            }

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
        // Explicitly re-activate previously active app
        if let app = previouslyActiveApp {
            if NSWorkspace.shared.frontmostApplication == app {
                print("[AxiomOS Intercept] Target app is already frontmost. Bypassing activation sleep.")
            } else {
                print("[AxiomOS Intercept] Restoring focus to: \(app.localizedName ?? "Unknown")")
                app.activate(options: [.activateIgnoringOtherApps])
                
                // Adaptive focus polling loop (up to 50ms)
                var focusRestored = false
                for i in 0..<10 {
                    if NSWorkspace.shared.frontmostApplication == app {
                        print("[AxiomOS Intercept] Focus restored successfully after \(i * 5)ms.")
                        focusRestored = true
                        break
                    }
                    try? await Task.sleep(nanoseconds: 5_000_000) // 5ms sleep
                }
                
                if !focusRestored {
                    print("[AxiomOS Intercept] Warning: Focus restoration timed out. Proceeding anyway.")
                }
            }
        }
        
        // 1. Accessibility Attempt
        let targetElement = cachedFocusedElement ?? getFocusedElement()
        if let focusedElement = targetElement {
            if setAccessibilitySelectedText(on: focusedElement, to: newValue) {
                print("[AxiomOS Intercept] Successfully replaced selected text via Accessibility APIs")
                clearCache()
                return
            }
        }
        
        // 2. Clipboard Fallback
        print("[AxiomOS Intercept] Accessibility replacement unavailable. Invoking Clipboard paste...")
        await replaceSelectionViaClipboard(with: newValue)
        clearCache()
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
        
        // Restore original clipboard after a safe delay of 500ms in a background task.
        // This gives the target application ample time to register the paste event and read the clipboard contents,
        // while preventing active thread blocking. We only restore if the clipboard still holds our text.
        Task {
            try? await Task.sleep(nanoseconds: 500_000_000) // 500ms
            let currentPasteboard = NSPasteboard.general
            if currentPasteboard.string(forType: .string) == newValue {
                currentPasteboard.clearContents()
                currentPasteboard.setString(previousString, forType: .string)
                print("[AxiomOS Intercept] Successfully restored original clipboard contents after paste.")
            }
        }
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
