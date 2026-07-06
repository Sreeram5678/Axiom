import Foundation

/// Executes autonomous Reason-Act-Observe (ReAct) loops targeting local files and compilation tools.
/// Uses the Gemini Cloud API as the reasoning core by executing structured prompts with tool schemas.
final class AgentEngine: Sendable {
    static let shared = AgentEngine()
    
    private init() {}
    
    /// Executes the ReAct loop to satisfy the given user goal.
    ///
    /// - Parameters:
    ///   - goal: The task description/goal (e.g. "Read dummy.swift, fix any bugs, compile it").
    ///   - onStepUpdate: Callback invoked with status/thought updates to update the HUD or console.
    /// - Returns: The final Answer string from the agent workflow.
    func run(
        goal: String,
        onStepUpdate: @escaping @Sendable (String) -> Void
    ) async throws -> String {
        print("[AgentEngine] Starting ReAct loop for goal: \(goal)")
        
        let systemPrompt = """
        You are an autonomous coding agent operating on a macOS system. Your goal is to help the user complete multi-step software tasks.
        
        You have access to a set of local system tools. You MUST invoke these tools to inspect the environment, read files, write code, and run commands.
        
        Available tools (represented in declarative JSON schemas):
        \(AgentTools.toolSchemas)
        
        CRITICAL: You run in a strict ReAct loop format. You MUST structure every response exactly like this:
        
        Thought: <Your reasoning about what to do next and why.>
        Action: { "tool": "tool_name", "arguments": { "arg_name": "arg_value" } }
        
        After you output an Action, STOP and output absolutely nothing else. The environment will run the tool and return the output as:
        Observation: <Tool outcome or error>
        
        You will then write another Thought and Action. When the task is complete and you have verified the results, output your final result in this format:
        Answer: <A comprehensive summary of the changes, compile outputs, and results.>
        
        Rules:
        1. Output ONLY ONE Thought and ONE Action per turn. Never output multiple Actions or follow-up Thoughts until you get the Observation.
        2. Ensure the Action block is valid JSON matching the schema.
        3. Be thorough. Read files before editing. Verify compilation or tests after edits.
        """
        
        var runningPrompt = "\(systemPrompt)\n\nGoal: \(goal)\n\nBegin the ReAct loop."
        var stepCount = 0
        let maxSteps = 10
        
        while stepCount < maxSteps {
            stepCount += 1
            onStepUpdate("Step \(stepCount)/\(maxSteps): Generating thought...")
            
            // Call Gemini Cloud API in "agent" (non-templated) mode to preserve ReAct format.
            // Bypasses local context stitching to prevent confusing the agent's reasoning path.
            let nextTurnText = try await GeminiClient.shared.optimizePrompt(
                rawPrompt: runningPrompt,
                modeId: "agent",
                length: "detailed",
                onChunk: { _ in } // We process intermediate turns silently until the final answer is reached
            )
            
            print("[AgentEngine] Loop \(stepCount) LLM Output:\n\(nextTurnText)")
            
            // Append the model's turn to the running prompt history
            runningPrompt += "\n\(nextTurnText)"
            
            // Parse final answer
            if let answer = extractAnswer(from: nextTurnText) {
                onStepUpdate("Success: Goal achieved.")
                return answer
            }
            
            // Parse Action JSON
            guard let action = extractAction(from: nextTurnText) else {
                // If the model did not output a valid action, ask it to correct its output format
                let correction = "\nObservation: ERROR: Invalid output format. You must specify exactly one Thought and one JSON Action block matching the schema or a final Answer."
                runningPrompt += correction
                print("[AgentEngine] Parser failed to find valid action. Prompting correction.")
                onStepUpdate("Step \(stepCount)/\(maxSteps): Formatting error. Retrying...")
                continue
            }
            
            onStepUpdate("Step \(stepCount)/\(maxSteps): Executing \(action.tool)...")
            
            // Run the tool on the background queue
            let observation = await AgentTools.execute(toolName: action.tool, arguments: action.arguments)
            
            print("[AgentEngine] Observation for \(action.tool):\n\(observation)")
            
            // Append the observation to the running log context
            runningPrompt += "\nObservation: \(observation)"
        }
        
        throw NSError(
            domain: "AgentEngine",
            code: 504,
            userInfo: [NSLocalizedDescriptionKey: "Failed to achieve goal within the maximum limit of \(maxSteps) steps."]
        )
    }
    
    // MARK: - Parsers
    
    struct ActionPayload {
        let tool: String
        let arguments: [String: Any]
    }
    
    func extractAnswer(from text: String) -> String? {
        if let range = text.range(of: "Answer:") {
            return String(text[range.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return nil
    }
    
    func extractAction(from text: String) -> ActionPayload? {
        // Find Action: prefix and extract the JSON block
        guard let actionRange = text.range(of: "Action:") else { return nil }
        let actionJsonStr = String(text[actionRange.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Find opening brace '{' and match with closing brace '}' to handle trailing characters or text
        guard let openBraceIdx = actionJsonStr.firstIndex(of: "{") else { return nil }
        let jsonSubstr = actionJsonStr[openBraceIdx...]
        
        var braceCount = 0
        var matchedJsonStr = ""
        for char in jsonSubstr {
            matchedJsonStr.append(char)
            if char == "{" { braceCount += 1 }
            else if char == "}" {
                braceCount -= 1
                if braceCount == 0 {
                    break
                }
            }
        }
        
        guard braceCount == 0, !matchedJsonStr.isEmpty else { return nil }
        
        guard let data = matchedJsonStr.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
              let tool = dict["tool"] as? String else {
            return nil
        }
        
        let arguments = dict["arguments"] as? [String: Any] ?? [:]
        return ActionPayload(tool: tool, arguments: arguments)
    }
}
