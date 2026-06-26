import Foundation

struct ConfigModel: Codable {
    var apiKey: String
    var defaultLength: String // "short", "medium", "detailed"
    var selectedModeId: String // "analyst", "engineer", "first-principles", "exec-summary", "proofread", "rewrite"
    var selectedModel: String? // Optional dynamic model selection
    
    static var `default`: ConfigModel {
        return ConfigModel(
            apiKey: "PASTE_YOUR_GEMINI_API_KEY_HERE",
            defaultLength: "medium",
            selectedModeId: "analyst",
            selectedModel: "gemini-3.5-flash"
        )
    }
}

class ConfigManager {
    static let shared = ConfigManager()
    
    private let configFileName = ".axiom_config.json"
    private var configModel: ConfigModel = .default
    private var cachedAPIKey: String?
    
    var apiKey: String {
        let localKey = configModel.apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if !localKey.isEmpty && localKey != "STORED_SECURELY_IN_KEYCHAIN" && localKey != "PASTE_YOUR_GEMINI_API_KEY_HERE" {
            return localKey
        }
        if let cached = cachedAPIKey {
            return cached
        }
        return configModel.apiKey
    }
    
    var defaultLength: String {
        get { configModel.defaultLength }
        set {
            configModel.defaultLength = newValue
            saveConfig()
        }
    }
    
    var selectedModeId: String {
        get { configModel.selectedModeId }
        set {
            configModel.selectedModeId = newValue
            saveConfig()
        }
    }
    
    var selectedModel: String {
        get { configModel.selectedModel ?? "gemini-3.5-flash" }
        set {
            configModel.selectedModel = newValue
            saveConfig()
        }
    }
    
    private var configFileURL: URL {
        if let customDir = ProcessInfo.processInfo.environment["AXIOM_CONFIG_DIR"] {
            return URL(fileURLWithPath: customDir).appendingPathComponent(configFileName)
        }
        return FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(configFileName)
    }
    
    private init() {
        loadConfig()
    }
    
    func loadConfig() {
        let url = configFileURL
        if FileManager.default.fileExists(atPath: url.path) {
            do {
                let data = try Data(contentsOf: url)
                var decoded = try JSONDecoder().decode(ConfigModel.self, from: data)
                
                // --- Safe Keychain-to-Plaintext Rollback Migration ---
                // Reads the API key from Keychain once, writes it to the config file as plain text,
                // and completely clears Keychain to prevent any future password prompts!
                if decoded.apiKey == "STORED_SECURELY_IN_KEYCHAIN" {
                    if let secureKey = KeychainHelper.shared.read(), !secureKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        print("[AxiomOS Migration] Successfully extracted API key from Keychain. Migrating to local config...")
                        decoded.apiKey = secureKey
                        self.configModel = decoded
                        saveConfig()
                        
                        // Delete key from keychain so it never prompts again
                        KeychainHelper.shared.delete()
                        print("[AxiomOS Migration] Deleted API key from Keychain. Password prompts are now permanently disabled.")
                    } else {
                        self.configModel = decoded
                    }
                } else {
                    self.configModel = decoded
                }
                print("[AxiomOS Config] Successfully loaded config from ~/.axiom_config.json")
            } catch {
                print("[AxiomOS Config] Error loading config, reverting to default: \(error)")
                saveConfig()
            }
        } else {
            print("[AxiomOS Config] Config file not found. Creating default template at ~/.axiom_config.json")
            saveConfig()
        }
    }
    
    func saveConfig() {
        let url = configFileURL
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(configModel)
            try data.write(to: url, options: .atomic)
            print("[AxiomOS Config] Successfully saved config to ~/.axiom_config.json")
        } catch {
            print("[AxiomOS Config] Error saving config: \(error)")
        }
    }
    
    @discardableResult
    func updateAPIKey(_ key: String) -> Bool {
        let trimmedKey = key.trimmingCharacters(in: .whitespacesAndNewlines)
        configModel.apiKey = trimmedKey
        cachedAPIKey = trimmedKey
        saveConfig()
        return true
    }
    
    func clearAPIKey() {
        KeychainHelper.shared.delete()
        cachedAPIKey = nil
        configModel.apiKey = "PASTE_YOUR_GEMINI_API_KEY_HERE"
        saveConfig()
    }
    
    func systemInstruction(for mode: String) -> String {
        switch mode {
        case "analyst":
            return "Optimize the prompt to request structured data, clear logical assumptions, key performance indicators, comparative frameworks, and detailed analytical breakdowns."
        case "engineer":
            return "Optimize the prompt to request high-quality, production-grade technical code or architecture designs. The prompt should explicitly seek edge-case handling, robust error management, code efficiency/complexity analysis (Big O), modular design patterns, security considerations, and comprehensive comments or documentation."
        case "first-principles":
            return "Optimize the prompt to demand first-principles thinking. It must deconstruct the query into its most fundamental truths."
        case "exec-summary":
            return "Optimize the prompt to demand a high-level strategic executive summary consisting of a 2-sentence overarching synthesis and 3-5 bulleted takeaways."
        case "proofread":
            return "You are an expert editor. Proofread the user's provided text. Fix all spelling mistakes, grammar errors, punctuation, and syntax issues. Improve sentence flow and readability without changing the core factual information or style of writing. Output ONLY the final polished text. Do NOT add markdown code blocks, introductory text, conversational preambles, or formatting unless requested."
        case "rewrite":
            return "You are a master of style and communication. Rewrite and polish the user's text to make it extremely clear, professional, elegant, and persuasive. Elevate the tone and vocabulary while fully preserving the technical details and core arguments. Output ONLY the rewritten text. Do NOT add markdown code blocks, introductory text, conversational preambles, or formatting unless requested."
        case "summarize":
            return "You are an expert summarizer. Condense the user's provided text to its absolute core essence, removing fluff while fully preserving all critical facts, data points, and context. Output ONLY the clean, summarized plain text."
        default:
            return "Optimize the user's prompt to achieve the highest quality response. Make it structured, clear, and contextually rich."
        }
    }
}
