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
    
    var apiKey: String { configModel.apiKey }
    var defaultLength: String { configModel.defaultLength }
    var selectedModeId: String {
        get { configModel.selectedModeId }
        set {
            configModel.selectedModeId = newValue
            saveConfig()
        }
    }
    
    private var configFileURL: URL {
        FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(configFileName)
    }
    
    private init() {
        loadConfig()
    }
    
    func loadConfig() {
        let url = configFileURL
        if FileManager.default.fileExists(atPath: url.path) {
            do {
                let data = try Data(contentsOf: url)
                let decoded = try JSONDecoder().decode(ConfigModel.self, from: data)
                self.configModel = decoded
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
