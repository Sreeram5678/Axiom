import XCTest

// MARK: - Local Test Mock of TAB_SYNC message processing for target-independent testing

class TestTabSyncBridge {
    static let shared = TestTabSyncBridge()
    
    struct TabSyncMessage {
        let url: String
        let title: String
        let snippet: String
        let timestamp: Double
    }
    
    func processMessage(_ json: [String: Any]) -> [String: Any] {
        guard let type = json["type"] as? String else {
            return ["type": "ERROR", "error": "Missing 'type' field"]
        }
        
        switch type {
        case "TAB_SYNC":
            guard let url = json["url"] as? String,
                  let title = json["title"] as? String else {
                return ["type": "ERROR", "error": "Missing required fields for TAB_SYNC"]
            }
            let snippet = json["snippet"] as? String ?? ""
            let timestamp = json["timestamp"] as? Double ?? Date().timeIntervalSince1970
            
            _ = TabSyncMessage(url: url, title: title, snippet: snippet, timestamp: timestamp)
            return ["type": "TAB_SYNC_ACK", "status": "stored"]
            
        default:
            return ["type": "ERROR", "error": "Unsupported request type: \(type)"]
        }
    }
}

// MARK: - Unit Tests

final class TabSyncTests: XCTestCase {
    
    func testTabSyncPacketProcessing() {
        let syncPayload: [String: Any] = [
            "type": "TAB_SYNC",
            "url": "https://react.dev/reference/react/useEffect",
            "title": "useEffect – React",
            "snippet": "useEffect is a React Hook that lets you synchronize a component with an external system.",
            "timestamp": Date().timeIntervalSince1970
        ]
        
        let response = TestTabSyncBridge.shared.processMessage(syncPayload)
        
        XCTAssertEqual(response["type"] as? String, "TAB_SYNC_ACK")
        XCTAssertEqual(response["status"] as? String, "stored")
    }
    
    func testTabSyncMissingFields() {
        let invalidPayload: [String: Any] = [
            "type": "TAB_SYNC",
            // missing url and title
            "snippet": "Malformed data payload"
        ]
        
        let response = TestTabSyncBridge.shared.processMessage(invalidPayload)
        
        XCTAssertEqual(response["type"] as? String, "ERROR")
        XCTAssertNotNil(response["error"])
    }
}
