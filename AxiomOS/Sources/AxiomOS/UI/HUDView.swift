import SwiftUI
import AppKit

enum HUDState {
    case idle
    case processing(String)
    case streaming(String)
    case success
    case error(String)
}

struct HUDAction: Identifiable {
    let id: String
    let name: String
    let description: String
    let keyChar: String
    let color: Color
}

struct HUDView: View {
    @State private var state: HUDState = .idle
    @State private var selectedIndex = 0
    @ObservedObject private var session = AxiomSession.shared
    @State private var selectedLength: String = ConfigManager.shared.defaultLength
    
    // Callback to close panel
    var onClose: (() -> Void)?
    
    private let actions = [
        HUDAction(id: "analyst", name: "Optimize Prompt", description: "Inject context structure & edge cases", keyChar: "O", color: Color(red: 0.1, green: 0.5, blue: 0.9)),
        HUDAction(id: "engineer", name: "Engineer Mode", description: "Optimize for robust code & edge cases", keyChar: "E", color: Color(red: 0.15, green: 0.35, blue: 0.85)),
        HUDAction(id: "proofread", name: "Proofread Text", description: "Fix typing grammar & sentence flow", keyChar: "P", color: Color(red: 0.1, green: 0.7, blue: 0.4)),
        HUDAction(id: "rewrite", name: "Rewrite & Elevate", description: "Enhance vocabulary & style elegantly", keyChar: "R", color: Color(red: 0.6, green: 0.3, blue: 0.9)),
        HUDAction(id: "exec-summary", name: "Executive Summary", description: "Deconstruct into bulleted takeaways", keyChar: "X", color: Color(red: 0.9, green: 0.6, blue: 0.1)),
        HUDAction(id: "first-principles", name: "First Principles", description: "Deconstruct query to core truths", keyChar: "F", color: Color(red: 0.85, green: 0.2, blue: 0.4)),
        HUDAction(id: "summarize", name: "Summarize Text", description: "Condense text to its core essence", keyChar: "S", color: Color(red: 0.2, green: 0.6, blue: 0.85))
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            headerView
            
            Divider()
                .background(Color.white.opacity(0.1))
            
            switch state {
            case .idle:
                actionsListView
            case .processing(let mode):
                processingView(mode: mode)
            case .streaming(let text):
                streamingView(text: text)
            case .success:
                successView
            case .error(let error):
                errorView(message: error)
            }
            
            footerView
        }
        .frame(width: 450, height: 280)
        .foregroundColor(.white)
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("HUDKeyDown"))) { notification in
            if let event = notification.object as? NSEvent {
                handleKeyDown(event)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("TriggerHUDAction"))) { notification in
            if let actionId = notification.object as? String {
                // Ensure state is reset to idle first so it can process clean selections
                self.state = .idle
                self.triggerAction(actionId)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("ResetHUDState"))) { _ in
            self.state = .idle
        }
    }
    
    // MARK: - Header
    
    private var headerView: some View {
        HStack(alignment: .center) {
            HStack(spacing: 8) {
                Text("✨")
                    .font(.system(size: 16))
                Text("AxiomOS")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .tracking(0.5)
            }
            
            Spacer()
            
            // Segmented length picker directly in the HUD header
            if case .idle = state {
                LengthSelectorView(selectedLength: $selectedLength)
            }
            
            Spacer()
            
            Button(action: { onClose?() }) {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white.opacity(0.5))
                    .padding(5)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.top, 14)
        .padding(.bottom, 10)
    }
    
    // MARK: - Footer
    
    private var footerView: some View {
        HStack {
            if case .idle = state {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Press matching letter key or use ⇅ arrows + Enter")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))
                    
                    let charCount = session.capturedText.count
                    let tokenCount = Double(charCount) / 4.0
                    let cost = (tokenCount / 1_000_000.0) * 0.075
                    Text("Highlight: \(charCount) chars | Est. Cost: $\(String(format: "%.5f", cost))")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.white.opacity(0.35))
                }
            } else if case .streaming = state {
                Text("Streaming optimized prompt...")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.4))
            } else {
                Spacer()
            }
            
            Spacer()
            
            Text("Esc to close")
                .font(.system(size: 10))
                .foregroundColor(.white.opacity(0.3))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color.white.opacity(0.06))
                .cornerRadius(4)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.black.opacity(0.15))
    }
    
    // MARK: - Idle: Actions List
    
    private var actionsListView: some View {
        ScrollView {
            VStack(spacing: 6) {
                ForEach(Array(actions.enumerated()), id: \.element.id) { index, action in
                    HStack(spacing: 12) {
                        // Color Indicator Icon
                        Circle()
                            .fill(action.color)
                            .frame(width: 8, height: 8)
                            .shadow(color: action.color.opacity(0.5), radius: 3)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(action.name)
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                            Text(action.description)
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        
                        Spacer()
                        
                        // Key Label indicator
                        Text(action.keyChar)
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.white.opacity(0.7))
                            .frame(width: 20, height: 20)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(5)
                            .overlay(
                                RoundedRectangle(cornerRadius: 5)
                                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
                            )
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(index == selectedIndex ? Color.white.opacity(0.08) : Color.clear)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(index == selectedIndex ? action.color.opacity(0.3) : Color.clear, lineWidth: 1)
                    )
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedIndex = index
                        triggerAction(action.id)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
    }
    
    // MARK: - State Views
    
    private func processingView(mode: String) -> some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.2)
            
            VStack(spacing: 6) {
                Text("Capturing Text...")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                Text("Processing through \(mode.uppercased()) instruction...")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .frame(maxHeight: .infinity)
    }
    
    private func streamingView(text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Generating...")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(actions[selectedIndex].color)
                
                Spacer()
            }
            
            ScrollView {
                Text(text)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.white.opacity(0.9))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .multilineTextAlignment(.leading)
            }
            .padding(10)
            .background(Color.black.opacity(0.2))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.05), lineWidth: 1)
            )
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(maxHeight: .infinity)
    }
    
    private var successView: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 40))
                .foregroundColor(Color(red: 0.1, green: 0.7, blue: 0.4))
                .shadow(color: Color(red: 0.1, green: 0.7, blue: 0.4).opacity(0.4), radius: 6)
            
            Text("Replaced Successfully!")
                .font(.system(size: 14, weight: .bold, design: .rounded))
        }
        .frame(maxHeight: .infinity)
        .onAppear {
            // Auto close after 1 sec
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                onClose?()
            }
        }
    }
    
    private func errorView(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 32))
                .foregroundColor(.red)
            
            Text(message)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            
            Button(action: { state = .idle }) {
                Text("Try Again")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.12))
                    .cornerRadius(6)
            }
            .buttonStyle(.plain)
        }
        .frame(maxHeight: .infinity)
    }
    
    // MARK: - Orchestrator Actions

    func triggerAction(_ actionId: String) {
        state = .processing(actionId)

        Task {
            // Retrieve selection from the pre-captured shared session context
            let selection = AxiomSession.shared.capturedText.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !selection.isEmpty else {
                DispatchQueue.main.async { self.state = .error("Highlight some text or type inside a field before triggering.") }
                return
            }

            // Immediately hide HUD and restore focus to the target editor.
            // The first API chunk arrives ~300-500ms later, well after focus is transferred.
            DispatchQueue.main.async {
                if let delegate = NSApplication.shared.delegate as? AppDelegate {
                    delegate.beginStreamingReplacement()
                }
            }

            do {
                var accumulated = ""
                let modeName = actions.first(where: { $0.id == actionId })?.name ?? "Optimize"
                TextInterception.shared.streamingModeName = modeName

                _ = try await GeminiClient.shared.optimizePrompt(
                    rawPrompt: selection,
                    modeId: actionId,
                    length: ConfigManager.shared.defaultLength,
                    onChunk: { chunk in
                        accumulated += chunk
                        let snapshot = accumulated
                        // Must run on main thread — AX API calls are not thread-safe
                        DispatchQueue.main.async {
                            TextInterception.shared.processStreamChunk(snapshot)
                        }
                    }
                )

                // Stream complete — finalize (plays Glass sound, handles clipboard fallback if needed)
                await TextInterception.shared.finishStreaming()
                DispatchQueue.main.async {
                    NSSound(named: "Glass")?.play()
                }

            } catch {
                TextInterception.shared.abortStreaming()
                DispatchQueue.main.async {
                    NSSound(named: "Basso")?.play()
                }
            }
        }
    }
    
    // MARK: - HUD Keyboard Handler
    
    private func handleKeyDown(_ event: NSEvent) {
        guard case .idle = state else {
            if event.keyCode == 53 { // Esc key
                onClose?()
            }
            return
        }
        
        switch event.keyCode {
        case 53: // Escape key
            onClose?()
        case 125: // Down arrow key
            selectedIndex = min(actions.count - 1, selectedIndex + 1)
        case 126: // Up arrow key
            selectedIndex = max(0, selectedIndex - 1)
        case 36: // Enter key
            triggerAction(actions[selectedIndex].id)
        default:
            // Check character hotkey matching (O, P, R, E, F)
            if let chars = event.charactersIgnoringModifiers?.uppercased(), !chars.isEmpty {
                if let matched = actions.first(where: { $0.keyChar == chars }) {
                    if let index = actions.firstIndex(where: { $0.id == matched.id }) {
                        selectedIndex = index
                    }
                    triggerAction(matched.id)
                }
            }
        }
    }
}

/// A premium macOS-style horizontal segmented picker for selecting prompt length.
struct LengthSelectorView: View {
    @Binding var selectedLength: String
    
    private let options = [
        ("short", "Small"),
        ("medium", "Medium"),
        ("detailed", "Detailed")
    ]
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.0) { option in
                Text(option.1)
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundColor(selectedLength == option.0 ? .white : .white.opacity(0.45))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 6)
                            .fill(selectedLength == option.0 ? Color.white.opacity(0.12) : Color.clear)
                    )
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedLength = option.0
                        ConfigManager.shared.defaultLength = option.0
                        NSSound(named: "Pop")?.play()
                    }
            }
        }
        .padding(2)
        .background(Color.black.opacity(0.2))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
    }
}
