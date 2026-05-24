import AppKit
import SwiftUI

/// A manager class to control the lifecycle and state of the Persistent Mini Result HUD.
class StreamResultHUDManager: ObservableObject {
    static let shared = StreamResultHUDManager()
    
    @Published var streamText: String = ""
    @Published var isStreaming: Bool = false
    @Published var isComplete: Bool = false
    @Published var modeName: String = "Optimize"
    
    private var hudPanel: StreamResultHUDPanel?
    
    private init() {}
    
    /// Shows the mini HUD and resets its state for a new stream session.
    /// - Parameter modeName: The human-readable name of the mode being executed.
    func show(modeName: String) {
        DispatchQueue.main.async {
            self.streamText = ""
            self.isStreaming = true
            self.isComplete = false
            self.modeName = modeName
            
            if self.hudPanel == nil {
                let view = StreamResultHUDView(manager: self)
                let hostingView = NSHostingView(rootView: view)
                self.hudPanel = StreamResultHUDPanel(contentView: hostingView)
            }
            
            self.hudPanel?.positionAtBottomRight()
            self.hudPanel?.orderFrontRegardless()
        }
    }
    
    /// Updates the live stream text in the HUD.
    /// - Parameter newText: The updated accumulated stream content.
    func updateText(_ newText: String) {
        DispatchQueue.main.async {
            self.streamText = newText
        }
    }
    
    /// Signals the HUD that the streaming session has finished.
    /// - Parameter finalText: The final response content.
    func completeText(_ finalText: String) {
        DispatchQueue.main.async {
            self.streamText = finalText
            self.isStreaming = false
            self.isComplete = true
        }
    }
    
    /// Closes the mini HUD and resets its properties.
    func close() {
        DispatchQueue.main.async {
            self.hudPanel?.orderOut(nil)
            self.isStreaming = false
            self.isComplete = false
            self.streamText = ""
        }
    }
}

/// An AppKit NSPanel custom subclass configured as a non-activating floating HUD window.
class StreamResultHUDPanel: NSPanel {
    init(contentView: NSView) {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: 380, height: 180),
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
        
        // Setup visual effect view for premium OS-level Glassmorphism matching the main HUD
        let effectView = NSVisualEffectView(frame: self.contentView!.bounds)
        effectView.autoresizingMask = [.width, .height]
        effectView.material = .hudWindow // Premium frosted glass
        effectView.blendingMode = .behindWindow
        effectView.state = .active
        effectView.wantsLayer = true
        effectView.layer?.cornerRadius = 16
        effectView.layer?.masksToBounds = true
        
        // Add content view
        effectView.addSubview(contentView)
        contentView.frame = effectView.bounds
        contentView.autoresizingMask = [.width, .height]
        
        self.contentView = effectView
    }
    
    override var canBecomeKey: Bool {
        return false // Prevents stealing keyboard focus so user can type continuously!
    }
    
    override var canBecomeMain: Bool {
        return false
    }
    
    /// Positions the mini HUD in the bottom-right corner of the active/main screen.
    func positionAtBottomRight() {
        if let screen = NSScreen.main ?? NSScreen.screens.first {
            let screenRect = screen.visibleFrame
            let x = screenRect.origin.x + screenRect.width - frame.width - 20
            let y = screenRect.origin.y + 20
            self.setFrameOrigin(NSPoint(x: x, y: y))
        }
    }
}

/// A SwiftUI view displaying the stream contents, state indicators, and control buttons.
struct StreamResultHUDView: View {
    @ObservedObject var manager: StreamResultHUDManager
    
    var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            HStack {
                HStack(spacing: 6) {
                    Text("✨")
                        .font(.system(size: 13))
                    Text(manager.modeName)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .tracking(0.3)
                }
                
                Spacer()
                
                // Real-time status indicators
                if manager.isStreaming {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 5, height: 5)
                        Text("Streaming...")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.blue.opacity(0.85))
                    }
                } else if manager.isComplete {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 5, height: 5)
                        Text("Complete")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.green.opacity(0.85))
                    }
                }
                
                Spacer().frame(width: 8)
                
                // Dismiss Button
                Button(action: {
                    manager.close()
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white.opacity(0.5))
                        .padding(5)
                        .background(Color.white.opacity(0.08))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.top, 10)
            .padding(.bottom, 6)
            
            Divider()
                .background(Color.white.opacity(0.1))
            
            // Streaming Content Display
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text(manager.streamText.isEmpty ? "Waiting for response..." : manager.streamText)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(.white.opacity(manager.streamText.isEmpty ? 0.4 : 0.9))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .multilineTextAlignment(.leading)
                }
            }
            .padding(8)
            .background(Color.black.opacity(0.2))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
            )
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            
            // Footer Control Buttons
            HStack(spacing: 8) {
                Spacer()
                
                // Copy & Close Button
                Button(action: {
                    let pasteboard = NSPasteboard.general
                    pasteboard.clearContents()
                    pasteboard.setString(manager.streamText, forType: .string)
                    manager.close()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "doc.on.doc")
                            .font(.system(size: 9))
                        Text("Copy & Close")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
                .disabled(manager.streamText.isEmpty)
                
                // Paste into Cursor Button
                Button(action: {
                    let text = manager.streamText
                    manager.close()
                    Task {
                        await TextInterception.shared.replaceSelection(with: text)
                    }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.right.doc.on.clipboard")
                            .font(.system(size: 9))
                        Text("Paste into Cursor")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(manager.streamText.isEmpty ? Color.blue.opacity(0.5) : Color.blue)
                    .cornerRadius(6)
                    .shadow(color: Color.blue.opacity(manager.streamText.isEmpty ? 0 : 0.3), radius: 4)
                }
                .buttonStyle(.plain)
                .disabled(manager.streamText.isEmpty)
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 10)
        }
        .frame(width: 380, height: 180)
        .foregroundColor(.white)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
    }
}
