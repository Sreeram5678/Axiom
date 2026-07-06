import Foundation

/// Handles standard input/output native messaging communication with Chrome.
class AxiomNativeBridge {
    static let shared = AxiomNativeBridge()
    
    private let stdin = FileHandle.standardInput
    private let stdout = FileHandle.standardOutput
    
    private init() {}
    
    /// Starts the native messaging reader loop. This is a blocking loop designed
    /// to run on a background thread or as the main process entrypoint in bridge mode.
    func run() {
        print("[AxiomOS Bridge] Starting Native Messaging Host Loop...")
        
        while true {
            guard let messageData = readMessage() else {
                print("[AxiomOS Bridge] Standard input closed or invalid data read. Exiting loop.")
                break
            }
            
            processMessage(messageData)
        }
    }
    
    /// Reads a message from stdin, parsing the 4-byte length header first.
    private func readMessage() -> Data? {
        // Read 4-byte length prefix
        guard let lengthData = try? stdin.read(upToCount: 4), lengthData.count == 4 else {
            return nil
        }
        
        // Convert 4 bytes to UInt32 (native byte order)
        let messageLength = lengthData.withUnsafeBytes { $0.load(as: UInt32.self) }
        
        // Read the actual JSON payload
        guard let payloadData = try? stdin.read(upToCount: Int(messageLength)),
              payloadData.count == Int(messageLength) else {
            return nil
        }
        
        return payloadData
    }
    
    /// Writes a JSON payload to stdout, prefixing it with the 4-byte length header.
    func writeMessage(_ jsonObject: [String: Any]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: jsonObject, options: []),
              !jsonData.isEmpty else {
            return
        }
        
        let length = UInt32(jsonData.count)
        var lengthBuffer = length
        let headerData = Data(bytes: &lengthBuffer, count: MemoryLayout<UInt32>.size)
        
        do {
            try stdout.write(contentsOf: headerData)
            try stdout.write(contentsOf: jsonData)
        } catch {
            print("[AxiomOS Bridge] Error writing response to stdout: \(error.localizedDescription)")
        }
    }
    
    /// Processes parsed incoming JSON payload.
    private func processMessage(_ data: Data) {
        guard let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else {
            writeMessage(["type": "ERROR", "error": "Invalid JSON format"])
            return
        }
        
        guard let type = json["type"] as? String else {
            writeMessage(["type": "ERROR", "error": "Missing 'type' field"])
            return
        }
        
        switch type {
        case "PING":
            writeMessage(["type": "PONG", "timestamp": Date().timeIntervalSince1970])
            
        case "GET_CONFIG":
            // Retrieve non-sensitive configuration settings
            let config: [String: Any] = [
                "defaultLength": ConfigManager.shared.defaultLength,
                "version": "1.0.0"
            ]
            writeMessage(["type": "CONFIG_RESPONSE", "config": config])
            
        case "TAB_SYNC":
            guard let url = json["url"] as? String,
                  let title = json["title"] as? String else {
                writeMessage(["type": "ERROR", "error": "Missing required fields for TAB_SYNC"])
                return
            }
            let snippet = json["snippet"] as? String ?? ""
            
            // Build content block for semantic graphing
            let contentBlock: String
            if !snippet.isEmpty {
                contentBlock = "Documentation snippet from tab '\(title)' (URL: \(url)):\n\(snippet)"
            } else {
                contentBlock = "Visited tab '\(title)' (URL: \(url))"
            }
            
            // Passively record into Context Graph via our debounced writer
            ContextGraphManager.shared.recordInteraction(
                rawPrompt: contentBlock,
                modeId: "tab_sync",
                responseLength: 0,
                latencyMs: 0
            )
            writeMessage(["type": "TAB_SYNC_ACK", "status": "stored"])
            
        default:
            writeMessage(["type": "ERROR", "error": "Unsupported request type: \(type)"])
        }
    }
}
