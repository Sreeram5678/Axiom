import Foundation

/// Manages system-level memory pressure events and the idle timer.
/// With local model sessions removed (Tier 0 / Tier 1 eliminated), this class now
/// provides two focused services:
///   1. OS kernel memory pressure monitoring — triggers `forceMemoryEviction()` to
///      flush the SQLite page cache and compact the WAL file under memory stress.
///   2. Idle-reaper timer — signals `ContextGraphManager` to run maintenance sweeps
///      and calls `malloc_zone_pressure_relief` to consolidate the Swift heap.
final class MemoryGuard: @unchecked Sendable {
    static let shared = MemoryGuard()

    private let queue = DispatchQueue(label: "com.axiom.axiomos.memoryguard", qos: .utility)
    private var pressureSource: DispatchSourceMemoryPressure?
    private var idleTimer: Timer?
    private let idleThreshold: TimeInterval = 45.0

    /// Optional external reclamation callback (reserved for future extensibility).
    var onReclamationRequired: (@Sendable () -> Void)?

    private init() {
        setupMemoryPressureListener()
    }

    private func setupMemoryPressureListener() {
        let source = DispatchSource.makeMemoryPressureSource(eventMask: [.warning, .critical], queue: queue)
        source.setEventHandler { [weak self] in
            print("[Axiom MemoryGuard] OS Memory Pressure detected! Flushing caches and compacting heap.")
            self?.forceMemoryEviction()
        }
        source.resume()
        self.pressureSource = source
    }

    /// Resets the idle countdown. Call this at the start or end of each inference request.
    func resetIdleTimer() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.idleTimer?.invalidate()
            self.idleTimer = Timer.scheduledTimer(withTimeInterval: self.idleThreshold, repeats: false) { [weak self] _ in
                print("[Axiom MemoryGuard] Idle threshold reached. Consolidating Swift heap.")
                self?.forceMemoryEviction()
            }
        }
    }

    /// Suspends the idle countdown during active prompt generation.
    func suspendIdleTimer() {
        DispatchQueue.main.async { [weak self] in
            self?.idleTimer?.invalidate()
            self?.idleTimer = nil
        }
    }

    /// Fires memory reclamation: flushes the ContextGraph WAL checkpoint,
    /// consolidates malloc zones, and runs optional external callbacks.
    func forceMemoryEviction() {
        DispatchQueue.main.async { [weak self] in
            self?.idleTimer?.invalidate()
            self?.idleTimer = nil
        }

        // Checkpoint the SQLite WAL to free up WAL file disk/RAM usage.
        ContextGraph.shared.execute("PRAGMA wal_checkpoint(PASSIVE);")

        // Trigger optional external reclamation (e.g., future Tier 3 caches).
        onReclamationRequired?()

        // Consolidate fragmented malloc zones in the Swift heap.
        malloc_zone_pressure_relief(nil, 0)
        print("[Axiom MemoryGuard] Eviction complete. WAL checkpointed, Swift heap consolidated.")
    }
}
