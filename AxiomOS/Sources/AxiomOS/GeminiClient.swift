import Foundation

class GeminiClient {
    static let shared = GeminiClient()
    
    private init() {}
    
    enum GeminiError: Error, LocalizedError {
        case missingAPIKey
        case emptyPrompt
        case invalidResponse(String)
        case networkError(String)
        
        var errorDescription: String? {
            switch self {
            case .missingAPIKey:
                return "API Key is missing. Please configure it in your ~/.axiom_config.json file."
            case .emptyPrompt:
                return "Prompt text is empty."
            case .invalidResponse(let msg):
                return "Gemini API Error: \(msg)"
            case .networkError(let msg):
                return "Network connection error: \(msg)"
            }
        }
    }
    
    func optimizePrompt(
        rawPrompt: String,
        modeId: String,
        length: String,
        onChunk: @escaping (String) -> Void
    ) async throws -> String {
        let apiKey = ConfigManager.shared.apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if apiKey.isEmpty || apiKey == "PASTE_YOUR_GEMINI_API_KEY_HERE" {
            throw GeminiError.missingAPIKey
        }
        
        let trimmedPrompt = rawPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedPrompt.isEmpty {
            throw GeminiError.emptyPrompt
        }
        
        // Define length directive exactly matching browser extension modules/api-handler.js
        var lengthDirective = ""
        if length == "short" {
            lengthDirective = "The optimized prompt MUST be short, extremely concise, direct, and focused only on the absolute essentials. Strip away all unnecessary elaboration, side details, or verbose phrasing."
        } else if length == "detailed" {
            lengthDirective = "The optimized prompt MUST be highly detailed, comprehensive, and thorough. Provide rich context, explicit parameters, background, and clear step-by-step instructions."
        } else {
            lengthDirective = "The optimized prompt MUST be of medium length, balancing clear context, structural clarity, and efficient detail without being overly brief or excessively wordy."
        }
        
        let systemInstruction = ConfigManager.shared.systemInstruction(for: modeId)
        
        // Setup payload structure conditionally with 6 distinct, specialized templates
        let systemPromptText: String
        let userPromptText: String
        
        switch modeId {
        case "analyst":
            systemPromptText = "You are a master Prompt Engineer specializing in business analysis, comparative frameworks, and structured metrics. Your task is to rewrite, refine, and optimize the user's prompt to achieve the highest quality analytical response. Incorporate the following persona guidelines:\n\n\(systemInstruction)\n\n\(lengthDirective)\n\nCRITICAL: Provide ONLY the optimized prompt. No preamble, no conversational filler, no markdown code blocks surrounding the prompt. Return it directly as clean plain text."
            userPromptText = "Please optimize the following raw prompt to request structured data, KPIs, assumptions, and analytical deconstructions. Provide only the clean, optimized prompt and nothing else.\n\nRaw prompt:\n\"\(trimmedPrompt)\""
            
        case "engineer":
            systemPromptText = "You are a master Prompt Engineer specializing in software architecture, system design, and production-grade software development. Your task is to rewrite, refine, and optimize the user's prompt to demand highly robust, secure, and clean technical solutions. Incorporate the following persona guidelines:\n\n\(systemInstruction)\n\n\(lengthDirective)\n\nCRITICAL: Provide ONLY the optimized prompt. No preamble, no conversational filler, no markdown code blocks surrounding the prompt. Return it directly as clean plain text."
            userPromptText = "Please optimize the following raw prompt to request production-grade technical code, Big O analysis, edge-case coverage, and detailed comments. Provide only the clean, optimized prompt and nothing else.\n\nRaw prompt:\n\"\(trimmedPrompt)\""
            
        case "first-principles":
            systemPromptText = "You are a master Prompt Engineer specializing in first-principles reasoning and logical deconstruction. Your task is to rewrite, refine, and optimize the user's prompt to demand deconstructing the query down to its absolute, fundamental, and undeniable truths. Incorporate the following persona guidelines:\n\n\(systemInstruction)\n\n\(lengthDirective)\n\nCRITICAL: Provide ONLY the optimized prompt. No preamble, no conversational filler, no markdown code blocks surrounding the prompt. Return it directly as clean plain text."
            userPromptText = "Please optimize the following raw prompt to demand first-principles analysis. Provide only the clean, optimized prompt and nothing else.\n\nRaw prompt:\n\"\(trimmedPrompt)\""
            
        case "exec-summary":
            systemPromptText = "You are a master Prompt Engineer specializing in executive summary generation and high-level strategic takeaways. Your task is to rewrite, refine, and optimize the user's prompt to demand a high-level strategic brief consisting of a 2-sentence synthesis and 3-5 bulleted takeaways. Incorporate the following persona guidelines:\n\n\(systemInstruction)\n\n\(lengthDirective)\n\nCRITICAL: Provide ONLY the optimized prompt. No preamble, no conversational filler, no markdown code blocks surrounding the prompt. Return it directly as clean plain text."
            userPromptText = "Please optimize the following raw prompt to request a high-level strategic executive summary brief. Provide only the clean, optimized prompt and nothing else.\n\nRaw prompt:\n\"\(trimmedPrompt)\""
            
        case "proofread":
            systemPromptText = "\(systemInstruction)\n\nCRITICAL: Do NOT perform prompt engineering, do NOT convert this text into an optimized prompt, and do NOT add conversational preambles. Output ONLY the polished, grammatically corrected text. No markdown code blocks (i.e. do not wrap the output in ```)."
            userPromptText = "Please proofread the following text for spelling, grammar, syntax, and flow. Provide only the polished result and nothing else.\n\nText:\n\"\(trimmedPrompt)\""
            
        case "rewrite":
            systemPromptText = "\(systemInstruction)\n\nCRITICAL: Do NOT perform prompt engineering, do NOT convert this text into an optimized prompt, and do NOT add conversational preambles. Output ONLY the beautifully rewritten and polished text. No markdown code blocks (i.e. do not wrap the output in ```)."
            userPromptText = "Please rewrite the following text to elevate its vocabulary, professional tone, and style while preserving all facts. Provide only the polished result and nothing else.\n\nText:\n\"\(trimmedPrompt)\""
            
        case "summarize":
            systemPromptText = "\(systemInstruction)\n\nCRITICAL: Do NOT perform prompt engineering, do NOT convert this text into an optimized prompt, and do NOT add conversational preambles. Output ONLY the beautifully condensed text. No markdown code blocks (i.e. do not wrap the output in ```)."
            userPromptText = "Please summarize the following text to capture its core facts concisely. Provide only the polished result and nothing else.\n\nText:\n\"\(trimmedPrompt)\""
            
        default:
            systemPromptText = "You are a master Prompt Engineer. Your task is to rewrite, refine, and optimize the user's prompt to achieve the highest quality response. Incorporate the following persona guidelines:\n\n\(systemInstruction)\n\n\(lengthDirective)\n\nCRITICAL: Provide ONLY the optimized prompt. No preamble, no conversational filler, no markdown code blocks. Return it directly as clean plain text."
            userPromptText = "Please optimize the following raw prompt. Provide only the clean, optimized prompt and nothing else.\n\nRaw prompt:\n\"\(trimmedPrompt)\""
        }
        
        // Payload dictionary to serialize
        let payload: [String: Any] = [
            "contents": [
                [
                    "role": "user",
                    "parts": [
                        ["text": userPromptText]
                    ]
                ]
            ],
            "systemInstruction": [
                "parts": [
                    ["text": systemPromptText]
                ]
            ],
            "generationConfig": [
                "temperature": 0.4
            ]
        ]
        
        let model = "gemini-3.1-flash-lite" // Native performant standard model
        let urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(model):streamGenerateContent?key=\(apiKey)"
        guard let url = URL(string: urlString) else {
            throw GeminiError.networkError("Invalid Gemini API URL.")
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
        request.timeoutInterval = 20.0
        
        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GeminiError.networkError("Failed to interpret HTTP response from Gemini.")
        }
        
        if httpResponse.statusCode != 200 {
            // Read standard error messages
            var errorBody = ""
            for try await line in bytes.lines {
                errorBody += line
            }
            if let data = errorBody.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errorDict = json["error"] as? [String: Any],
               let errMsg = errorDict["message"] as? String {
                throw GeminiError.invalidResponse(errMsg)
            }
            throw GeminiError.invalidResponse("HTTP \(httpResponse.statusCode)")
        }
        
        var accumulatedText = ""
        var braceCount = 0
        var inString = false
        var escapeNext = false
        var currentObjectData = Data()
        var inObject = false

        // Ultra-optimized line-buffered raw byte-level streaming parser.
        // Reading line-by-line cuts task suspension overhead 60x from ~30,000 to ~500.
        // Individual line bytes are scanned synchronously in-place in memory.
        for try await line in bytes.lines {
            let lineData = Data(line.utf8)
            for byte in lineData {
                if escapeNext {
                    escapeNext = false
                    if inObject { currentObjectData.append(byte) }
                    continue
                }
                if byte == 92 { // '\'
                    escapeNext = true
                    if inObject { currentObjectData.append(byte) }
                    continue
                }
                if byte == 34 { // '"'
                    inString = !inString
                    if inObject { currentObjectData.append(byte) }
                    continue
                }

                if !inString {
                    if byte == 123 { // '{'
                        braceCount += 1
                        inObject = true
                    } else if byte == 125 { // '}'
                        braceCount -= 1
                    }
                }

                if inObject { currentObjectData.append(byte) }

                // Once braces balance, we have a complete JSON object
                if inObject && !inString && braceCount == 0 {
                    if let json = try? JSONSerialization.jsonObject(with: currentObjectData) as? [String: Any],
                       let candidates = json["candidates"] as? [[String: Any]],
                       let firstCandidate = candidates.first,
                       let content = firstCandidate["content"] as? [String: Any],
                       let parts = content["parts"] as? [[String: Any]],
                       let firstPart = parts.first,
                       let partText = firstPart["text"] as? String {
                        accumulatedText += partText
                        onChunk(partText)
                    }
                    
                    // Reset for the next object
                    currentObjectData.removeAll(keepingCapacity: true)
                    inObject = false
                    inString = false
                    escapeNext = false
                }
            }
            
            // Add a newline character byte (10) to preserve whitespace inside string literals
            if inObject {
                currentObjectData.append(10) // '\n'
            }
        }
        
        // Clean up formatting
        var cleanedResult = accumulatedText.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanedResult.hasPrefix("```") {
            cleanedResult = cleanedResult
                .replacingOccurrences(of: "^```[a-zA-Z]*\\n?", with: "", options: .regularExpression)
                .replacingOccurrences(of: "\\n?```$", with: "", options: .regularExpression)
                .trimmingCharacters(in: .whitespacesAndNewlines)
        }
        
        return cleanedResult
    }
}
