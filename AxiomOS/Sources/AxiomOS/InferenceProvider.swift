import Foundation

/// Defines a unified interface for prompt optimization and LLM inference providers.
protocol InferenceProvider: Sendable {
    /// String identifier for the provider.
    var identifier: String { get }

    /// Generates structured optimizations or edits based on user prompts and selected modes.
    func optimizePrompt(
        rawPrompt: String,
        modeId: String,
        length: String,
        base64Image: String?,
        onChunk: @escaping @Sendable (String) -> Void
    ) async throws -> String
}

extension InferenceProvider {
    /// Backwards compatibility wrapper for text-only calls.
    func optimizePrompt(
        rawPrompt: String,
        modeId: String,
        length: String,
        onChunk: @escaping @Sendable (String) -> Void
    ) async throws -> String {
        return try await optimizePrompt(
            rawPrompt: rawPrompt,
            modeId: modeId,
            length: length,
            base64Image: nil,
            onChunk: onChunk
        )
    }
}
