import AppKit
import SwiftUI

class HUDPanel: NSPanel {
    init(contentView: NSView) {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: 450, height: 280),
            styleMask: [.borderless, .nonactivatingPanel, .hudWindow],
            backing: .buffered,
            defer: false
        )
        
        self.isFloatingPanel = true
        self.level = .statusBar
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.backgroundColor = .clear
        self.isOpaque = false
        self.hasShadow = true
        self.titleVisibility = .hidden
        self.titlebarAppearsTransparent = true
        
        // Setup visual effect view for premium OS-level Glassmorphism
        let effectView = NSVisualEffectView(frame: self.contentView!.bounds)
        effectView.autoresizingMask = [.width, .height]
        effectView.material = .hudWindow // Modern frosted glass
        effectView.blendingMode = .behindWindow
        effectView.state = .active
        effectView.wantsLayer = true
        effectView.layer?.cornerRadius = 18
        effectView.layer?.masksToBounds = true
        
        // Add content view
        effectView.addSubview(contentView)
        contentView.frame = effectView.bounds
        contentView.autoresizingMask = [.width, .height]
        
        self.contentView = effectView
    }
    
    override var canBecomeKey: Bool {
        return true
    }
    
    override var canBecomeMain: Bool {
        return false
    }
    
    func centerOnActiveScreen() {
        if let screen = NSScreen.main ?? NSScreen.screens.first {
            let screenRect = screen.visibleFrame
            let x = screenRect.origin.x + (screenRect.width - frame.width) / 2
            let y = screenRect.origin.y + (screenRect.height - frame.height) / 2
            self.setFrameOrigin(NSPoint(x: x, y: y))
        }
    }
    
    func positionNearMouseCursor() {
        let mouseLocation = NSEvent.mouseLocation
        if let screen = NSScreen.main ?? NSScreen.screens.first {
            let screenRect = screen.visibleFrame
            
            // Default offset below mouse cursor
            var x = mouseLocation.x - (frame.width / 2)
            var y = mouseLocation.y - frame.height - 20
            
            // Screen boundaries check
            x = max(screenRect.origin.x + 10, min(x, screenRect.origin.x + screenRect.width - frame.width - 10))
            y = max(screenRect.origin.y + 10, min(y, screenRect.origin.y + screenRect.height - frame.height - 10))
            
            self.setFrameOrigin(NSPoint(x: x, y: y))
        }
    }
    
    override func keyDown(with event: NSEvent) {
        NotificationCenter.default.post(name: Notification.Name("HUDKeyDown"), object: event)
    }
}
