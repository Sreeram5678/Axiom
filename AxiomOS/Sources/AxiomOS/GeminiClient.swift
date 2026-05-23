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
        
        // Setup payload structure
        let systemPromptText = "You are a master Prompt Engineer. Your task is to rewrite, refine, and optimize the user's prompt to achieve the highest quality response. Incorporate the following persona and guidelines:\n\n\(systemInstruction)\n\n\(lengthDirective)\n\nCRITICAL: Provide ONLY the optimized prompt. No preamble (e.g., 'Here is your optimized prompt:'), no conversational filler, no markdown code blocks surrounding the prompt (i.e. do not wrap the output in ``` or ```text). Return it directly as clean plain text."
        
        let userPromptText = "Please optimize the following raw prompt. Make it highly professional, effective, and detailed according to your persona rules. Provide only the clean, optimized prompt and nothing else.\n\nRaw prompt:\n\"\(trimmedPrompt)\""
        
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
        
        let model = "gemini-2.5-flash" // Native performant standard model
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
        var buffer = ""
        var braceCount = 0
        var inString = false
        var escapeNext = false
        var startIndex = -1
        
        // Stream parser utilizing the identical brace-matching pipeline for robust streaming chunk decoding
        for try await byte in bytes {
            guard let char = String(bytes: [byte], encoding: .utf8)?.first else { continue }
            buffer.append(char)
            
            if escapeNext {
                escapeNext = false
                continue
            }
            if char == "\\" {
                escapeNext = true;
                continue
            }
            if char == "\"" {
                inString = !inString
                continue
            }
            if !inString {
                if char == "{" {
                    if braceCount == 0 {
                        startIndex = buffer.count - 1
                    }
                    braceCount += 1
                } else if char == "}" {
                    braceCount -= 1
                    if braceCount == 0 && startIndex != -1 {
                        // Extract JSON object
                        let startIndexVal = buffer.index(buffer.startIndex, offsetBy: startIndex)
                        let jsonStr = String(buffer[startIndexVal...])
                        
                        if let data = jsonStr.data(using: .utf8) {
                            do {
                                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                                   let candidates = json["candidates"] as? [[String: Any]],
                                   let firstCandidate = candidates.first,
                                   let content = firstCandidate["content"] as? [String: Any],
                                   let parts = content["parts"] as? [[String: Any]],
                                   let firstPart = parts.first,
                                   let partText = firstPart["text"] as? String {
                                    
                                    accumulatedText += partText
                                    onChunk(partText)
                                }
                            } catch {
                                // Ignore partial or invalid chunks silently
                            }
                        }
                        
                        // Reset search states
                        buffer = ""
                        startIndex = -1
                    }
                }
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
