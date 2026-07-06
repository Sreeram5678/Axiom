import Foundation

// MARK: - PIIRedactor

/// A stateless regex-based PII masking pipeline.
/// Scans text for API keys, passwords, IP addresses, tokens, and personal identity numbers,
/// replacing each match with a typed masking token BEFORE any payload reaches the Gemini API.
///
/// All regexes are compiled once at type-initialisation time and stored as static constants,
/// so the redaction pass adds only microseconds of latency per call.
enum PIIRedactor {

    // MARK: - Masking Token Labels

    private static let maskAPIKey     = "[REDACTED_API_KEY]"
    private static let maskPassword   = "[REDACTED_PASSWORD]"
    private static let maskIPAddress  = "[REDACTED_IP_ADDRESS]"
    private static let maskToken      = "[REDACTED_TOKEN]"
    private static let maskID         = "[REDACTED_ID]"
    private static let maskEmail      = "[REDACTED_EMAIL]"
    private static let maskSSN        = "[REDACTED_SSN]"

    // MARK: - Compiled Regex Rules (compiled once, reused on every call)

    /// Each rule is a `(pattern, maskToken)` pair ordered from most specific to least specific.
    private static let rules: [(pattern: NSRegularExpression, mask: String)] = {
        let defs: [(String, String)] = [

            // --- API Keys & Tokens ---
            // Google API keys: AIza followed by 35 alphanumeric/special chars
            (#"AIza[0-9A-Za-z\-_]{35}"#,                                                    maskAPIKey),
            // Generic Bearer / Authorization header values
            (#"(?i)(?:Bearer|Authorization:?\s*Bearer)\s+[A-Za-z0-9\-_.~+/]+=*"#,          maskToken),
            // AWS Access Key IDs (AKIA…)
            (#"\bAKIA[0-9A-Z]{16}\b"#,                                                     maskAPIKey),
            // AWS Secret Access Keys (40-char base64-ish after known prefixes)
            (#"(?i)(?:aws_secret_access_key|secret_key)\s*[=:]\s*[A-Za-z0-9/+=]{40}"#,    maskAPIKey),
            // Generic long hex / base64 secrets assigned to key/token/secret variables
            (#"(?i)(?:api[_-]?key|access[_-]?token|secret[_-]?key|client[_-]?secret)\s*[=:]\s*['\"]?([A-Za-z0-9\-_.~+/=]{20,})['\"]?"#, maskAPIKey),
            // GitHub Personal Access Tokens (ghp_, gho_, ghu_, ghs_, ghr_ prefixes)
            (#"\bgh[pousr]_[A-Za-z0-9_]{36,255}\b"#,                                      maskToken),
            // Stripe secret keys (sk_live_ / sk_test_ prefix)
            (#"\bsk_(live|test)_[0-9a-zA-Z]{24,}\b"#,                                     maskAPIKey),
            // Twilio Auth Tokens (34 hex chars)
            (#"\b[0-9a-f]{32}\b"#,                                                         maskToken),
            // JWT tokens (three base64url segments separated by dots)
            (#"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"#,                 maskToken),

            // --- Passwords in assignment context ---
            (#"(?i)(?:password|passwd|pwd|pass)\s*[=:]\s*['\"]?(\S{6,})['\"]?"#,          maskPassword),

            // --- Emails ---
            (#"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"#,                   maskEmail),

            // --- IP Addresses ---
            // IPv4
            (#"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"#, maskIPAddress),
            // IPv6 (simplified — captures full-colon and abbreviated forms)
            (#"\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b"#,                         maskIPAddress),

            // --- Personal Identity Numbers ---
            // US Social Security Numbers (ddd-dd-dddd)
            (#"\b\d{3}-\d{2}-\d{4}\b"#,                                                   maskSSN),
            // Generic numeric IDs assigned to common label prefixes
            (#"(?i)(?:user_?id|account_?id|person_?id|employee_?id)\s*[=:]\s*\d{4,}"#,   maskID),
        ]

        return defs.compactMap { (pattern, mask) in
            guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
                print("[PIIRedactor] WARNING: Failed to compile pattern: \(pattern)")
                return nil
            }
            return (regex, mask)
        }
    }()

    // MARK: - Public API

    /// Applies all PII redaction rules in sequence to `text`.
    /// Returns the sanitised string with all matching spans replaced by masking tokens.
    /// This function is safe to call from any thread.
    static func redact(_ text: String) -> (redacted: String, patternsFound: Int) {
        var result = text
        var hitCount = 0
        let range = NSRange(result.startIndex..., in: result)

        for (regex, mask) in rules {
            let newResult = regex.stringByReplacingMatches(
                in: result,
                options: [],
                range: NSRange(result.startIndex..., in: result),
                withTemplate: mask
            )
            if newResult != result {
                hitCount += 1
                result = newResult
            }
            _ = range // suppress unused warning
        }

        if hitCount > 0 {
            print("[PIIRedactor] Masked \(hitCount) PII pattern category(ies) in payload before dispatch.")
        }

        return (result, hitCount)
    }
}
