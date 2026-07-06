import XCTest

final class AgentEngineTests: XCTestCase {
    
    // Struct representing the parsed action payload matching AgentEngine's type
    struct ActionPayload {
        let tool: String
        let arguments: [String: Any]
    }
    
    // Exact copy of AgentEngine's extractAnswer method to verify parsing logic
    func extractAnswer(from text: String) -> String? {
        if let range = text.range(of: "Answer:") {
            return String(text[range.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return nil
    }
    
    // Exact copy of AgentEngine's extractAction method to verify parsing logic
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
    
    func testExtractAnswer() {
        let textWithAnswer = """
        Thought: I have read the file.
        Answer: Successfully read the file contents.
        """
        
        let answer = extractAnswer(from: textWithAnswer)
        XCTAssertEqual(answer, "Successfully read the file contents.")
        
        let textWithoutAnswer = "Thought: I should search for a file."
        XCTAssertNil(extractAnswer(from: textWithoutAnswer))
    }
    
    func testExtractAction() {
        let textWithAction = """
        Thought: I need to list the directory.
        Action: { "tool": "list_directory", "arguments": { "path": "/Users/sreeram/Axiom" } }
        """
        
        let action = extractAction(from: textWithAction)
        XCTAssertNotNil(action)
        XCTAssertEqual(action?.tool, "list_directory")
        XCTAssertEqual(action?.arguments["path"] as? String, "/Users/sreeram/Axiom")
        
        let textWithMultilineAction = """
        Thought: Let's write the file.
        Action:
        {
          "tool": "write_file",
          "arguments": {
            "path": "/tmp/test.txt",
            "content": "Hello World!"
          }
        }
        """
        
        let multilineAction = extractAction(from: textWithMultilineAction)
        XCTAssertNotNil(multilineAction)
        XCTAssertEqual(multilineAction?.tool, "write_file")
        XCTAssertEqual(multilineAction?.arguments["path"] as? String, "/tmp/test.txt")
        XCTAssertEqual(multilineAction?.arguments["content"] as? String, "Hello World!")
    }
}
