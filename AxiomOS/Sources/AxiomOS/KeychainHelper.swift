import Foundation
import Security
import LocalAuthentication

class KeychainHelper {
    static let shared = KeychainHelper()
    
    var service = "com.axiom.axiomos"
    var account = "GeminiAPIKey"
    var useAccessControl = true
    
    private init() {}
    
    @discardableResult
    func save(password: String) -> Bool {
        guard let data = password.data(using: .utf8) else { return false }
        
        // Remove existing key if any
        delete()
        
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]
        
        if useAccessControl {
            // .biometryCurrentSet binds this Keychain item to the EXACT biometric set enrolled
            // at the time of saving. Fixes two HIGH findings:
            //   • CWE-305: Unlike .userPresence, .biometryCurrentSet invalidates the entry if
            //     new biometrics are added later — an attacker who knows the passcode cannot
            //     enrol their own fingerprint/face to bypass authentication.
            //   • CWE-272: Unlike .userPresence, .biometryCurrentSet has NO passcode fallback,
            //     enforcing the stronger biometric modality instead of a 4/6-digit PIN.
            var accessError: Unmanaged<CFError>?
            guard let accessControl = SecAccessControlCreateWithFlags(
                nil,
                kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
                .biometryCurrentSet,
                &accessError
            ), accessError == nil else {
                return false
            }
            query[kSecAttrAccessControl as String] = accessControl
        } else {
            query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        }
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func read() -> String? {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        if useAccessControl {
            // Supply an LAContext so the OS surfaces a Face ID / Touch ID prompt.
            // No passcode fallback is possible because the item was stored with
            // .biometryCurrentSet — the OS enforces biometric-only access automatically.
            let context = LAContext()
            context.localizedReason = "Authenticate to use your Axiom API key"
            query[kSecUseAuthenticationContext as String] = context
        }
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess, let data = dataTypeRef as? Data {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
    
    func delete() {
        delete(account: account)
    }
    
    // MARK: - Dynamic Keychain Access
    
    @discardableResult
    func save(password: String, account: String) -> Bool {
        guard let data = password.data(using: .utf8) else { return false }
        delete(account: account)
        
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func read(account: String) -> String? {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess, let data = dataTypeRef as? Data {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
    
    func delete(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}
