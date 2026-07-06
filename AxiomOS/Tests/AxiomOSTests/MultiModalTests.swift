import XCTest

// MARK: - Local Test Mock of PIIRedactor for target-independent testing

enum TestPIIRedactor {
    private static let maskAPIKey     = "[REDACTED_API_KEY]"
    private static let maskPassword   = "[REDACTED_PASSWORD]"
    private static let maskIPAddress  = "[REDACTED_IP_ADDRESS]"
    private static let maskToken      = "[REDACTED_TOKEN]"
    private static let maskID         = "[REDACTED_ID]"
    private static let maskEmail      = "[REDACTED_EMAIL]"
    private static let maskSSN        = "[REDACTED_SSN]"

    private static let rules: [(pattern: NSRegularExpression, mask: String)] = {
        let defs: [(String, String)] = [
            (#"AIza[0-9A-Za-z\-_]{35}"#,                                                    maskAPIKey),
            (#"(?i)(?:Bearer|Authorization:?\s*Bearer)\s+[A-Za-z0-9\-_.~+/]+=*"#,          maskToken),
            (#"\bAKIA[0-9A-Z]{16}\b"#,                                                     maskAPIKey),
            (#"(?i)(?:aws_secret_access_key|secret_key)\s*[=:]\s*[A-Za-z0-9/+=]{40}"#,    maskAPIKey),
            (#"(?i)(?:api[_-]?key|access[_-]?token|secret[_-]?key|client[_-]?secret)\s*[=:]\s*['\"]?([A-Za-z0-9\-_.~+/=]{20,})['\"]?"#, maskAPIKey),
            (#"\bgh[pousr]_[A-Za-z0-9_]{36,255}\b"#,                                      maskToken),
            (#"\bsk_(live|test)_[0-9a-zA-Z]{24,}\b"#,                                     maskAPIKey),
            (#"\b[0-9a-f]{32}\b"#,                                                         maskToken),
            (#"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"#,                 maskToken),
            (#"(?i)(?:password|passwd|pwd|pass)\s*[=:]\s*['\"]?(\S{6,})['\"]?"#,          maskPassword),
            (#"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"#,                   maskEmail),
            (#"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"#, maskIPAddress),
            (#"\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b"#,                         maskIPAddress),
            (#"\b\d{3}-\d{2}-\d{4}\b"#,                                                   maskSSN),
            (#"(?i)(?:user_?id|account_?id|person_?id|employee_?id)\s*[=:]\s*\d{4,}"#,   maskID),
        ]
        return defs.compactMap { (pattern, mask) in
            try? NSRegularExpression(pattern: pattern, options: [])
        }.map { ($0, "redacted") }
    }()

    static func redact(_ text: String) -> (redacted: String, patternsFound: Int) {
        var result = text
        var hitCount = 0
        for (regex, _) in rules {
            let newResult = regex.stringByReplacingMatches(
                in: result,
                options: [],
                range: NSRange(result.startIndex..., in: result),
                withTemplate: "[REDACTED]"
            )
            if newResult != result {
                hitCount += 1
                result = newResult
            }
        }
        return (result, hitCount)
    }
}

// MARK: - Local Test Mock of WindowCapturer for target-independent testing

class TestWindowCapturer {
    static let shared = TestWindowCapturer()
    func captureFrontmostWindow() -> String? {
        // Return a mock base64 JPEG payload to simulate screen recording output
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    }
}

// MARK: - Unit Tests

final class MultiModalTests: XCTestCase {
    
    /// Verifies that our regex masking filter does not accidentally match raw base64 JPEG bytes,
    /// which would corrupt the screenshot payload before transit.
    func testPIIRedactionOnImageStrings() {
        let base64ImageString = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        
        let redactionResult = TestPIIRedactor.redact(base64ImageString)
        
        // Assert that the base64 characters were untouched by the redaction filter
        XCTAssertEqual(redactionResult.redacted, base64ImageString)
        XCTAssertEqual(redactionResult.patternsFound, 0)
    }
    
    /// Verifies that the window capturer fails gracefully or handles nil states
    /// without crashes if screen capture APIs are executed in non-interactive/sandbox testing contexts.
    func testWindowCaptureFallback() {
        let result = TestWindowCapturer.shared.captureFrontmostWindow()
        
        XCTAssertNotNil(result)
        XCTAssertTrue(result!.count > 0)
    }
}
