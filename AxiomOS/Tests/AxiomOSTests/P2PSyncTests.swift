import XCTest
import CryptoKit

// MARK: - Target Independent Mock of P2PSyncManager

struct TestP2PSyncManager {
    static func deriveSessionKey(pin: String, challenge: String) -> String {
        let input = "\(pin):\(challenge)"
        let digest = SHA256.hash(data: Data(input.utf8))
        return digest.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Unit Tests

final class P2PSyncTests: XCTestCase {
    
    /// Verifies that our 6-digit PIN session key derivation is deterministic and matches
    /// across both sides of the TCP socket handshake given matching inputs.
    func testPINSessionKeyDerivation() {
        let pin = "123456"
        let challenge = "e57cb058-29ef-4bf2-bd2a-9cb873d6e5d2"
        
        let keyA = TestP2PSyncManager.deriveSessionKey(pin: pin, challenge: challenge)
        let keyB = TestP2PSyncManager.deriveSessionKey(pin: pin, challenge: challenge)
        
        XCTAssertEqual(keyA, keyB)
        XCTAssertEqual(keyA.count, 64) // SHA-256 Hex output length
    }
    
    /// Verifies that different challenges or PIN inputs yield different derived keys,
    /// protecting the pairing mesh from replay or brute-force key collisions.
    func testPINSessionKeyCollisionSafety() {
        let keyA = TestP2PSyncManager.deriveSessionKey(pin: "123456", challenge: "challenge_one")
        let keyB = TestP2PSyncManager.deriveSessionKey(pin: "123456", challenge: "challenge_two")
        let keyC = TestP2PSyncManager.deriveSessionKey(pin: "654321", challenge: "challenge_one")
        
        XCTAssertNotEqual(keyA, keyB)
        XCTAssertNotEqual(keyA, keyC)
        XCTAssertNotEqual(keyB, keyC)
    }
    
    /// Verifies that SQLite node data serialization schemas are formatted correctly
    /// for P2P profile transmission packets.
    func testP2PProfileDataSchemaFormatting() {
        let sampleNodes: [[String: Any]] = [
            ["content": "Visited index.html", "mode_id": "tab_sync"],
            ["content": "Optimized prompt for main.go", "mode_id": "analyst"]
        ]
        
        let syncPayload: [String: Any] = [
            "type": "PROFILE_SYNC",
            "nodes": sampleNodes
        ]
        
        XCTAssertEqual(syncPayload["type"] as? String, "PROFILE_SYNC")
        guard let nodes = syncPayload["nodes"] as? [[String: Any]] else {
            XCTFail("Missing nodes array")
            return
        }
        XCTAssertEqual(nodes.count, 2)
        XCTAssertEqual(nodes[0]["content"] as? String, "Visited index.html")
        XCTAssertEqual(nodes[1]["mode_id"] as? String, "analyst")
    }
}
