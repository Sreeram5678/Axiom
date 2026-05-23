import Foundation

struct ConfigModel: Codable {
    var apiKey: String
    var defaultLength: String // "short", "medium", "detailed"
    var selectedModeId: String // "analyst", "engineer", "first-principles", "exec-summary", "proofread", "rewrite"
    
    static var `default`: ConfigModel {
        return ConfigModel(
            apiKey: "PASTE_YOUR_GEMINI_API_KEY_HERE",
            defaultLength: "medium",
            selectedModeId: "analyst"
        )
    }
}

class ConfigManager {
    static let shared = ConfigManager()
    
    private let configFileName = ".axiom_config.json"
    private var configModel: ConfigModel = .default
    
    var apiKey: String {
        // Read directly from secure Keychain if available and valid
        if let secureKey = KeychainHelper.shared.read(), secureKey != "STORED_SECURELY_IN_KEYCHAIN" && secureKey != "PASTE_YOUR_GEMINI_API_KEY_HERE" && !secureKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return secureKey
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
                
                // --- Keychain Migration & Redaction ---
                let localKey = decoded.apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
                if localKey != "STORED_SECURELY_IN_KEYCHAIN" && localKey != "PASTE_YOUR_GEMINI_API_KEY_HERE" && !localKey.isEmpty {
                    // Safe copy plain-text API key from JSON dotfile into Secure Keychain
                    let success = KeychainHelper.shared.save(password: localKey)
                    if success {
                        print("[AxiomOS Keychain] Successfully migrated API key to secure Keychain.")
                        // Redact API key from plain text configuration model
                        decoded.apiKey = "STORED_SECURELY_IN_KEYCHAIN"
                        self.configModel = decoded
                        saveConfig()
                    } else {
                        print("[AxiomOS Keychain] Failed to save key to secure Keychain. Falling back to plain text model.")
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
            var modelToSave = configModel
            
            // Check if the current model in memory contains a raw plain-text API key to protect
            let localKey = modelToSave.apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
            if localKey != "STORED_SECURELY_IN_KEYCHAIN" && localKey != "PASTE_YOUR_GEMINI_API_KEY_HERE" && !localKey.isEmpty {
                KeychainHelper.shared.save(password: localKey)
                modelToSave.apiKey = "STORED_SECURELY_IN_KEYCHAIN"
            }
            
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(modelToSave)
            try data.write(to: url, options: .atomic)
            print("[AxiomOS Config] Successfully saved config to ~/.axiom_config.json")
        } catch {
            print("[AxiomOS Config] Error saving config: \(error)")
        }
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
