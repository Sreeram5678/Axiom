import Foundation

/// Defines declarative JSON schemas and standard execution methods for the agent's tool set.
/// Supported tools:
///   1. `read_file(path: String)`
///   2. `write_file(path: String, content: String)`
///   3. `list_directory(path: String)`
///   4. `execute_command(command: String)`
final class AgentTools: Sendable {
    
    /// Declarative JSON representation of available tools, to be injected into the ReAct system prompt.
    static let toolSchemas = """
    [
      {
        "name": "read_file",
        "description": "Reads the entire contents of a file at the specified absolute path.",
        "parameters": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "The absolute path of the file to read."
            }
          },
          "required": ["path"]
        }
      },
      {
        "name": "write_file",
        "description": "Creates or overwrites a file at the specified absolute path with the given content.",
        "parameters": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "The absolute path of the file to write."
            },
            "content": {
              "type": "string",
              "description": "The complete text content to write to the file."
            }
          },
          "required": ["path", "content"]
        }
      },
      {
        "name": "list_directory",
        "description": "Lists the files and subdirectories inside the specified absolute directory path.",
        "parameters": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "The absolute path of the directory to list."
            }
          },
          "required": ["path"]
        }
      },
      {
        "name": "execute_command",
        "description": "Runs a shell command (e.g. running builds or executing tests) in a sub-shell and returns stdout/stderr.",
        "parameters": {
          "type": "object",
          "properties": {
            "command": {
              "type": "string",
              "description": "The zsh shell command to execute."
            }
          },
          "required": ["command"]
        }
      }
    ]
    """

    /// Executes the specified tool by name with the parsed JSON arguments dictionary.
    /// Returns the text output of the tool execution, which will be fed back as the turn Observation.
    static func execute(toolName: String, arguments: [String: Any]) async -> String {
        print("[AgentTools] Executing tool '\(toolName)' with args: \(arguments)")
        switch toolName {
        case "read_file":
            guard let path = arguments["path"] as? String else {
                return "ERROR: Missing required parameter 'path'."
            }
            return await readFile(path: path)
            
        case "write_file":
            guard let path = arguments["path"] as? String,
                  let content = arguments["content"] as? String else {
                return "ERROR: Missing required parameters 'path' or 'content'."
            }
            return await writeFile(path: path, content: content)
            
        case "list_directory":
            guard let path = arguments["path"] as? String else {
                return "ERROR: Missing required parameter 'path'."
            }
            return await listDirectory(path: path)
            
        case "execute_command":
            guard let command = arguments["command"] as? String else {
                return "ERROR: Missing required parameter 'command'."
            }
            return await executeCommand(command: command)
            
        default:
            return "ERROR: Unknown tool '\(toolName)'."
        }
    }

    // MARK: - Tool Implementations

    private static func readFile(path: String) async -> String {
        let expandedPath = NSString(string: path).expandingTildeInPath
        do {
            let content = try String(contentsOfFile: expandedPath, encoding: .utf8)
            return "File read successfully from: \(path)\nContent:\n\(content)"
        } catch {
            return "ERROR: Failed to read file at \(path): \(error.localizedDescription)"
        }
    }

    private static func writeFile(path: String, content: String) async -> String {
        let expandedPath = NSString(string: path).expandingTildeInPath
        let url = URL(fileURLWithPath: expandedPath)
        do {
            let parentDir = url.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: parentDir, withIntermediateDirectories: true, attributes: nil)
            try content.write(to: url, atomically: true, encoding: .utf8)
            return "SUCCESS: Successfully wrote \(content.count) characters to \(path)"
        } catch {
            return "ERROR: Failed to write file at \(path): \(error.localizedDescription)"
        }
    }

    private static func listDirectory(path: String) async -> String {
        let expandedPath = NSString(string: path).expandingTildeInPath
        do {
            let items = try FileManager.default.contentsOfDirectory(atPath: expandedPath)
            if items.isEmpty {
                return "Directory \(path) is empty."
            }
            return "SUCCESS: Items in \(path):\n" + items.map { "- \($0)" }.joined(separator: "\n")
        } catch {
            return "ERROR: Failed to list directory at \(path): \(error.localizedDescription)"
        }
    }

    private static func executeCommand(command: String) async -> String {
        // Enforce zsh execution, running outside any restricted App Sandbox constraints.
        let process = Process()
        let pipe = Pipe()
        
        process.standardOutput = pipe
        process.standardError = pipe
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-c", command]
        
        // Default working directory to user home
        process.currentDirectoryURL = FileManager.default.homeDirectoryForCurrentUser
        
        do {
            try process.run()
            process.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .ascii) ?? ""
            
            return """
            Command executed with status: \(process.terminationStatus)
            Output:
            \(output)
            """
        } catch {
            return "ERROR: Failed to run command: \(error.localizedDescription)"
        }
    }
}
