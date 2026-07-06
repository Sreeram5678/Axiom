import Foundation

// MARK: - ContextGraphManager

/// Orchestrates the Persistent Context Graph lifecycle:
/// passive learning from user interactions, background write throttling,
/// idle-rate-limited maintenance sweeps, and strict 8 GB RAM budget constraints.
///
/// **RAM Budget Strategy**:
/// - All database writes run on `TaskPriority.background` async tasks so they
///   never contend with the active inference workload.
/// - Maintenance sweeps (TTL pruning, incremental vacuum) are gated behind an
///   idle detector: they only fire when the user has been inactive for ≥ `idleGracePeriod`.
/// - A semaphore caps concurrent background write workers at 1 to bound peak memory
///   consumption from SQLite page cache and WAL file growth simultaneously.
final class ContextGraphManager: @unchecked Sendable {
    static let shared = ContextGraphManager()

    // MARK: - Configuration

    /// Minimum interval between write-flush batches regardless of incoming rate.
    private let writeDebounceInterval: TimeInterval = 3.0

    /// Time the user must be idle (no inference requests) before maintenance sweeps run.
    private let idleGracePeriod: TimeInterval = 60.0

    /// Maximum number of interaction records kept before oldest are pruned.
    private let maxInteractionLogSize: Int = 10_000

    // MARK: - Internal State

    private var pendingBatch: [PendingEntry] = []
    private let batchLock = NSLock()

    /// Serialises the commit of pending batches so we never open two write transactions
    /// simultaneously — critical for WAL-mode DB size and 8GB memory constraints.
    private let writeSemaphore = DispatchSemaphore(value: 1)

    private var lastWriteTime: Date = .distantPast
    private var lastUserActivityTime: Date = .distantPast
    private var maintenanceTimer: Timer?
    private var writeDebounceWorkItem: DispatchWorkItem?

    // Background GCD queue for all DB work.
    private let bgQueue = DispatchQueue(
        label: "com.axiom.axiomos.contextgraph.manager",
        qos: .background,
        attributes: []
    )

    // MARK: - Pending Entry Model

    private struct PendingEntry {
        let rawPrompt: String
        let modeId: String?
        let optimizedResponseLength: Int?
        let latencyMs: Int?
        let sourceDomain: String?
    }

    // MARK: - Init

    private init() {
        scheduleMaintenanceTimer()
        print("[ContextGraphManager] Initialised. Write debounce: \(writeDebounceInterval)s, Idle grace: \(idleGracePeriod)s.")
    }

    // MARK: - Public Ingestion API

    /// Called by `FoundationModelRouter` / `GeminiClient` after each successful inference.
    /// Enqueues the interaction for a debounced background write — never blocks the caller.
    func recordInteraction(
        rawPrompt: String,
        modeId: String?,
        responseLength: Int?,
        latencyMs: Int?,
        sourceDomain: String? = nil
    ) {
        lastUserActivityTime = Date()

        let entry = PendingEntry(
            rawPrompt: rawPrompt,
            modeId: modeId,
            optimizedResponseLength: responseLength,
            latencyMs: latencyMs,
            sourceDomain: sourceDomain
        )

        batchLock.lock()
        pendingBatch.append(entry)
        batchLock.unlock()

        scheduleDebouncedFlush()
    }

    // MARK: - Debounced Write Flush

    private func scheduleDebouncedFlush() {
        // Cancel any pending flush workitem; reset the debounce window.
        writeDebounceWorkItem?.cancel()
        let workItem = DispatchWorkItem { [weak self] in
            self?.flushPendingBatch()
        }
        writeDebounceWorkItem = workItem
        bgQueue.asyncAfter(deadline: .now() + writeDebounceInterval, execute: workItem)
    }

    /// Atomically drains `pendingBatch` and commits each entry to the ContextGraph DB
    /// under a single WAL write transaction. Runs entirely on `bgQueue` (background priority).
    private func flushPendingBatch() {
        batchLock.lock()
        guard !pendingBatch.isEmpty else {
            batchLock.unlock()
            return
        }
        let batch = pendingBatch
        pendingBatch.removeAll(keepingCapacity: true)
        batchLock.unlock()

        // Block until any prior write transaction completes — 1 writer at a time.
        writeSemaphore.wait()
        defer { writeSemaphore.signal() }

        let graph = ContextGraph.shared
        let embedEngine = EmbeddingEngine.shared

        // Wrap all inserts in a single deferred transaction for efficiency and atomicity.
        graph.execute("BEGIN DEFERRED TRANSACTION;")
        var committed = 0

        for entry in batch {
            let trimmed = entry.rawPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }

            // 1. Compute a stable content hash for deduplication.
            let hash = embedEngine.contentHash(for: trimmed)

            // 2. Upsert the semantic node.
            let nodeId = graph.upsertNode(
                contentHash: hash,
                content: trimmed,
                nodeType: "prompt",
                sourceDomain: entry.sourceDomain
            )
            guard nodeId > 0 else { continue }

            // 3. Compute and store the embedding vector (only if not yet stored).
            if let vector = embedEngine.embed(text: trimmed), !vector.isEmpty {
                graph.storeEmbedding(
                    nodeId: nodeId,
                    vector: vector,
                    dimension: embedEngine.vectorDimension
                )
            }

            // 4. Log the raw interaction for audit + weight tuning.
            graph.logInteraction(
                nodeId: nodeId,
                rawPrompt: trimmed,
                modeId: entry.modeId,
                responseLength: entry.optimizedResponseLength,
                latencyMs: entry.latencyMs
            )

            committed += 1
        }

        graph.execute("COMMIT;")

        if committed > 0 {
            print("[ContextGraphManager] Flushed \(committed) context node(s) to graph DB.")
        }

        lastWriteTime = Date()
    }

    // MARK: - Idle-Gated Maintenance

    /// Schedules a repeating timer that checks user idle state and triggers
    /// maintenance (pruning + vacuum) only when the user has been inactive
    /// for at least `idleGracePeriod` seconds, avoiding sweep-related latency
    /// spikes during active coding sessions.
    private func scheduleMaintenanceTimer() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.maintenanceTimer = Timer.scheduledTimer(
                withTimeInterval: 30.0, // Check every 30 seconds
                repeats: true
            ) { [weak self] _ in
                self?.checkAndRunMaintenance()
            }
        }
    }

    private func checkAndRunMaintenance() {
        let idleDuration = Date().timeIntervalSince(lastUserActivityTime)
        guard idleDuration >= idleGracePeriod else {
            return // User is active; skip maintenance to preserve UX responsiveness.
        }

        bgQueue.async { [weak self] in
            self?.runMaintenanceSweep()
        }
    }

    /// Performs TTL-based node pruning + incremental vacuum.
    /// Only runs on `bgQueue` during user idle windows.
    private func runMaintenanceSweep() {
        writeSemaphore.wait()
        defer { writeSemaphore.signal() }

        print("[ContextGraphManager] Running idle maintenance sweep...")
        let graph = ContextGraph.shared

        // Prune nodes older than 90 days with fewer than 2 accesses (cold / one-off contexts).
        graph.pruneStaleNodes(ttlDays: 90, minAccessCount: 2)

        // Prune interaction log if it exceeds the row limit to cap DB file growth.
        pruneInteractionLog(graph: graph)

        // Reclaim freed pages incrementally — 200 pages ≈ 1.6 MB per sweep pass.
        graph.vacuumIncremental(pages: 200)

        print("[ContextGraphManager] Maintenance sweep complete.")
    }

    /// Keeps the interactions table bounded at `maxInteractionLogSize` rows,
    /// deleting the oldest entries first. This prevents unbounded growth on
    /// long-lived developer machines operating within 8 GB RAM constraints.
    private func pruneInteractionLog(graph: ContextGraph) {
        let deleteSql = """
            DELETE FROM interactions
            WHERE id IN (
                SELECT id FROM interactions
                ORDER BY created_at ASC
                LIMIT MAX(0, (SELECT COUNT(*) FROM interactions) - \(maxInteractionLogSize))
            );
        """
        graph.execute(deleteSql)
    }

    // MARK: - Context Retrieval (Cold-Start Elimination)

    /// Returns the top-`k` context snippets most semantically similar to `prompt`.
    /// This data is injected as a preamble into Gemini API payloads, giving the model
    /// memory of the user's coding patterns without any cold-start penalty.
    func retrieveRelevantContext(for prompt: String, k: Int = 5) async -> [ContextSnippet] {
        return await Task(priority: .userInitiated) {
            let hits = EmbeddingEngine.shared.retrieveSimilarContext(for: prompt, k: k)
            return hits.map { ContextSnippet(nodeId: $0.nodeId, score: $0.score, content: $0.content) }
        }.value
    }

    // MARK: - Manual Flush (for app termination)

    /// Forces an immediate synchronous flush of any pending writes.
    /// Call this from `applicationWillTerminate` to avoid data loss.
    func flushImmediately() {
        writeDebounceWorkItem?.cancel()
        flushPendingBatch()
    }
}

// MARK: - ContextSnippet

/// A resolved context hit from the Persistent Context Graph, ready for prompt injection.
struct ContextSnippet: Sendable {
    let nodeId: Int64
    let score: Float    // Cosine similarity in [0, 1]
    let content: String
}
