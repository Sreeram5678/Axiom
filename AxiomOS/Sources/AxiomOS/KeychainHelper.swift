import Foundation
import Security
import LocalAuthentication

class KeychainHelper {
    static let shared = KeychainHelper()
    
    var service = "com.axiom.axiomos"
    var account = "GeminiAPIKey"
    
    private init() {}
    
    @discardableResult
    func save(password: String) -> Bool {
        guard let data = password.data(using: .utf8) else { return false }
        
        // Remove existing key if any
        delete()
        
        // Require device passcode or biometric authentication before the secret can be read.
        // This satisfies CWE-287 (Improper Authentication) by ensuring the OS verifies
        // the user's identity before granting access to the Keychain item.
        var accessError: Unmanaged<CFError>?
        guard let accessControl = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            .userPresence,
            &accessError
        ), accessError == nil else {
            return false
        }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessControl as String: accessControl
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func read() -> String? {
        // Provide a LAContext with a prompt so the OS surfaces the biometric/passcode
        // authentication dialog to the user before returning the secret.
        let context = LAContext()
        context.localizedReason = "Authenticate to use your Axiom API key"
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecUseAuthenticationContext as String: context
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess, let data = dataTypeRef as? Data {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
    
    func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}
