import Foundation
import Network

/// Central inference router for AxiomOS.
/// Dispatches all generative inference exclusively to the Google Gemini Cloud API.
///
/// Before every request, the router runs the full Milestone 3 + 4 pipeline:
///   1. **MemoryPressureMonitor** — samples `host_statistics64` to select the T_max token budget.
///   2. **AmbientContextStitcher** — assembles a live developer context snapshot (cursor line,
///      surrounding code, last compile error) subject to compression rules and the token budget.
///   3. **PIIRedactor** — ensures the raw user prompt is sanitised before leaving the process.
///   4. **ContextGraphManager** — retrieves the top-5 semantically similar prior context nodes
///      (cold-start elimination) and records the interaction post-inference.
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
        base64Image: String? = nil,
        onChunk: @escaping @Sendable (String) -> Void
    ) async throws -> String {
        guard isOnline else {
            throw NSError(
                domain: "AxiomRouter",
                code: 1001,
                userInfo: [NSLocalizedDescriptionKey: "Network connection is offline. Axiom requires an active internet connection for Gemini Cloud inference."]
            )
        }

        // ── Step 1: Sample memory pressure and determine token budget ──────────
        let tokenBudget = MemoryPressureMonitor.shared.currentBudget
        print("[Axiom Router] \(MemoryPressureMonitor.shared.tierDescription)")

        // ── Step 2: PII-redact the raw user prompt ─────────────────────────────
        let (redactedPrompt, piiHits) = PIIRedactor.redact(rawPrompt)
        if piiHits > 0 {
            print("[Axiom Router] PII redacted \(piiHits) category(ies) from user prompt.")
        }

        // ── Step 3: Assemble ambient cursor / compile-error context ────────────
        // Capture cursor context synchronously on a background thread to avoid
        // blocking the main thread with AX polling.
        let lowerPrompt = rawPrompt.lowercased()
        let isVisualRequest = lowerPrompt.contains("visual")
            || lowerPrompt.contains("bug")
            || lowerPrompt.contains("ui")
            || lowerPrompt.contains("screenshot")
            || lowerPrompt.contains("rendering")
            || lowerPrompt.contains("layout")
            || lowerPrompt.contains("render")
            || modeId == "engineer"

        let stitchedContext = await Task(priority: .userInitiated) {
            // Capture live AX cursor state.
            _ = AmbientContextStitcher.shared.captureCursorContext()
            // Assemble the final context payload with token-budget enforcement and PII redaction.
            return AmbientContextStitcher.shared.assembleContext(tokenBudget: tokenBudget, includeScreenshot: isVisualRequest)
        }.value

        // ── Step 4: Retrieve prior learned context from the Persistent Graph ───
        let contextHits = await ContextGraphManager.shared.retrieveRelevantContext(for: redactedPrompt, k: 5)

        // ── Step 5: Build the enriched prompt string ───────────────────────────
        var enrichedPrompt = redactedPrompt
        var enrichmentParts: [String] = []

        // 5a. Ambient context block (only if non-empty).
        let ambientBlock = stitchedContext.formatted()
        if !ambientBlock.isEmpty {
            enrichmentParts.append("[Ambient Developer Context (live)]:\n\(ambientBlock)")
        }

        // 5b. Persistent graph context (prior learned patterns).
        if !contextHits.isEmpty {
            let graphBlock = contextHits
                .map { "- \($0.content) (relevance: \(String(format: "%.2f", $0.score)))" }
                .joined(separator: "\n")
            enrichmentParts.append("[Prior User Context — learned from past sessions]:\n\(graphBlock)")
        }

        // 5c. Compose final payload.
        if !enrichmentParts.isEmpty {
            enrichedPrompt = enrichmentParts.joined(separator: "\n\n")
                + "\n\n[Current Prompt]:\n\(redactedPrompt)"
            print("[Axiom Router] Prompt enriched: ambient=\(!ambientBlock.isEmpty), graph_nodes=\(contextHits.count)")
        }

        // ── Step 6: Dispatch to Gemini Cloud ──────────────────────────────────
        let startTime = Date()
        print("[Axiom Router] Dispatching to Gemini Cloud API (T_max=\(tokenBudget) tokens, visual=\(isVisualRequest)).")

        let activeImage = base64Image ?? stitchedContext.base64Image
        let result = try await GeminiClient.shared.optimizePrompt(
            rawPrompt: enrichedPrompt,
            modeId: modeId,
            length: length,
            base64Image: activeImage,
            onChunk: onChunk
        )

        // ── Step 7: Record interaction in Persistent Context Graph ─────────────
        let latencyMs = Int(Date().timeIntervalSince(startTime) * 1000)
        ContextGraphManager.shared.recordInteraction(
            rawPrompt: redactedPrompt,         // Store the PII-clean original, not the enriched form.
            modeId: modeId,
            responseLength: result.count,
            latencyMs: latencyMs
        )

        return result
    }
}
