import XCTest

final class KeychainHelperTests: XCTestCase {
    
    let testService = "com.axiom.axiomos.test"
    let testAccount = "GeminiAPIKey_Test"
    
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        // Point KeychainHelper to test service/account
        KeychainHelper.shared.service = testService
        KeychainHelper.shared.account = testAccount
        
        // Clean up before test runs
        KeychainHelper.shared.delete()
    }
    
    override func tearDownWithError() throws {
        // Clean up after test runs
        KeychainHelper.shared.delete()
        
        try super.tearDownWithError()
    }
    
    func testKeychainSaveAndRead() throws {
        let mockPassword = "TEST_API_KEY_12345"
        
        // Save password
        let saveSuccess = KeychainHelper.shared.save(password: mockPassword)
        XCTAssertTrue(saveSuccess, "Should successfully save password to Keychain")
        
        // Read password back
        let readPassword = KeychainHelper.shared.read()
        XCTAssertEqual(readPassword, mockPassword, "Read password should match saved password")
    }
    
    func testKeychainDelete() throws {
        let mockPassword = "TEST_API_KEY_DELETE"
        
        // Save
        KeychainHelper.shared.save(password: mockPassword)
        
        // Delete
        KeychainHelper.shared.delete()
        
        // Read back (should be nil)
        let readPassword = KeychainHelper.shared.read()
        XCTAssertNil(readPassword, "Password should be nil after deletion")
    }
    
    func testKeychainOverwrite() throws {
        let mockPassword1 = "KEY_FIRST"
        let mockPassword2 = "KEY_SECOND"
        
        // Save first
        KeychainHelper.shared.save(password: mockPassword1)
        
        // Overwrite by saving second
        let saveSuccess = KeychainHelper.shared.save(password: mockPassword2)
        XCTAssertTrue(saveSuccess, "Should successfully overwrite password in Keychain")
        
        // Read back (should match second)
        let readPassword = KeychainHelper.shared.read()
        XCTAssertEqual(readPassword, mockPassword2, "Should read the updated password")
    }
}
