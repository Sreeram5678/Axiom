import XCTest

final class ConfigTests: XCTestCase {
    
    var tempDirectory: URL!
    let testService = "com.axiom.axiomos.test"
    let testAccount = "GeminiAPIKey_Test"
    
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        // Point KeychainHelper to test service/account
        KeychainHelper.shared.service = testService
        KeychainHelper.shared.account = testAccount
        KeychainHelper.shared.delete()
        
        // Setup isolated configuration directory
        tempDirectory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: tempDirectory, withIntermediateDirectories: true)
        
        // Inject directory path into environment variable
        setenv("AXIOM_CONFIG_DIR", tempDirectory.path, 1)
        
        // Clean start: make sure no config file exists initially
        let configPath = tempDirectory.appendingPathComponent(".axiom_config.json").path
        if FileManager.default.fileExists(atPath: configPath) {
            try FileManager.default.removeItem(atPath: configPath)
        }
    }
    
    override func tearDownWithError() throws {
        // Clean environment
        unsetenv("AXIOM_CONFIG_DIR")
        
        // Clean Keychain and file system
        KeychainHelper.shared.delete()
        if FileManager.default.fileExists(atPath: tempDirectory.path) {
            try FileManager.default.removeItem(at: tempDirectory)
        }
        
        try super.tearDownWithError()
    }
    
    func testDefaultFallbackConfig() throws {
        // Load config from the empty environment
        ConfigManager.shared.loadConfig()
        
        // Verify fallback states
        XCTAssertEqual(ConfigManager.shared.defaultLength, "medium")
        XCTAssertEqual(ConfigManager.shared.selectedModeId, "analyst")
        XCTAssertEqual(ConfigManager.shared.apiKey, "PASTE_YOUR_GEMINI_API_KEY_HERE")
    }
    
    func testLoadCustomConfig() throws {
        // Prepare a custom JSON config file
        let customJSON = """
        {
            "apiKey": "MY_CUSTOM_TEST_KEY",
            "defaultLength": "detailed",
            "selectedModeId": "engineer"
        }
        """
        
        let configURL = tempDirectory.appendingPathComponent(".axiom_config.json")
        try customJSON.write(to: configURL, atomically: true, encoding: .utf8)
        
        // Load custom config
        ConfigManager.shared.loadConfig()
        
        // The API Key should be successfully migrated to Keychain, and the plain-text in-memory/JSON value should be redacted to "STORED_SECURELY_IN_KEYCHAIN"
        // Let's verify keychain has the raw value first
        XCTAssertEqual(KeychainHelper.shared.read(), "MY_CUSTOM_TEST_KEY")
        
        // The computed apiKey property of ConfigManager should still return "MY_CUSTOM_TEST_KEY" (via Keychain)
        XCTAssertEqual(ConfigManager.shared.apiKey, "MY_CUSTOM_TEST_KEY")
        
        // Verify defaultLength and selectedModeId are loaded
        XCTAssertEqual(ConfigManager.shared.defaultLength, "detailed")
        XCTAssertEqual(ConfigManager.shared.selectedModeId, "engineer")
        
        // Verify that the file content was rewritten and redacted
        let updatedData = try Data(contentsOf: configURL)
        let decoded = try JSONDecoder().decode(ConfigModel.self, from: updatedData)
        XCTAssertEqual(decoded.apiKey, "STORED_SECURELY_IN_KEYCHAIN", "The API key in JSON dotfile must be redacted to protect privacy")
    }
    
    func testSystemInstructions() {
        let analystInstruction = ConfigManager.shared.systemInstruction(for: "analyst")
        XCTAssertTrue(analystInstruction.contains("structured data"))
        
        let engineerInstruction = ConfigManager.shared.systemInstruction(for: "engineer")
        XCTAssertTrue(engineerInstruction.contains("production-grade"))
        
        let fallbackInstruction = ConfigManager.shared.systemInstruction(for: "unknown_mode")
        XCTAssertTrue(fallbackInstruction.contains("highest quality"))
    }
}
