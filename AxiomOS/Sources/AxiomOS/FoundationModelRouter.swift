import Foundation
import Network

/// A routing engine that dispatches all generative inference to the Google Gemini Cloud API.
/// Tier 0 (Apple FoundationModels) and Tier 1 (Ollama) have been removed per the
/// architectural pivot decision. Gemini Cloud is now the sole generative engine for AxiomOS.
///
/// Every successful inference call passively records the interaction into the
/// Persistent Context Graph (via `ContextGraphManager`) and enriches the next
/// request with retrieved semantic context — eliminating the cold-start problem.
final class FoundationModelRouter: InferenceProvider, @unchecked Sendable {
    static let shared = FoundationModelRouter()

    let identifier = "axiom.router.gemini-cloud"

    private let networkMonitor = NWPathMonitor()
    private var isOnline = true

    private init() {
        startNetworkMonitoring()
    }

    private func startNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            self?.isOnline = path.status == .satisfied
            print("[Axiom Router] Network state change: isOnline = \(path.status == .satisfied)")
        }
        let queue = DispatchQueue(label: "com.axiom.axiomos.router.network", qos: .utility)
        networkMonitor.start(queue: queue)
    }

    func optimizePrompt(
        rawPrompt: String,
        modeId: String,
        length: String,
        onChunk: @escaping @Sendable (String) -> Void
    ) async throws -> String {
        guard isOnline else {
            throw NSError(
                domain: "AxiomRouter",
                code: 1001,
                userInfo: [NSLocalizedDescriptionKey: "Network connection is offline. Axiom requires an active internet connection for Gemini Cloud inference."]
            )
        }

        // --- Persistent Context Graph: retrieve prior learned context ---
        let contextHits = await ContextGraphManager.shared.retrieveRelevantContext(for: rawPrompt, k: 5)
        var enrichedPrompt = rawPrompt
        if !contextHits.isEmpty {
            let contextBlock = contextHits
                .map { "- \($0.content) (relevance: \(String(format: "%.2f", $0.score)))" }
                .joined(separator: "\n")
            enrichedPrompt = """
            [Prior User Context — learned from past sessions]:
            \(contextBlock)

            [Current Prompt]:
            \(rawPrompt)
            """
            print("[Axiom Router] Enriched prompt with \(contextHits.count) context node(s) from graph.")
        }

        let startTime = Date()
        print("[Axiom Router] Dispatching to Gemini Cloud API (sole generative engine).")

        let result = try await GeminiClient.shared.optimizePrompt(
            rawPrompt: enrichedPrompt,
            modeId: modeId,
            length: length,
            onChunk: onChunk
        )

        // --- Persistent Context Graph: record this interaction passively ---
        let latencyMs = Int(Date().timeIntervalSince(startTime) * 1000)
        ContextGraphManager.shared.recordInteraction(
            rawPrompt: rawPrompt, // Store the original prompt, not the enriched one
            modeId: modeId,
            responseLength: result.count,
            latencyMs: latencyMs
        )

        return result
    }
}
