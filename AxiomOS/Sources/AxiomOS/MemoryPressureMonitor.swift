import Foundation
import Darwin

// MARK: - MemoryPressureMonitor

/// Queries the macOS kernel's `host_statistics64` API to determine the current
/// physical memory pressure tier, then returns the corresponding maximum token
/// budget (T_max) for Gemini Cloud API payloads.
///
/// This is a pure sampling approach — no persistent background thread.
/// The caller queries `currentBudget` synchronously on the calling queue,
/// making it safe to call from any async context without additional overhead.
final class MemoryPressureMonitor: @unchecked Sendable {
    static let shared = MemoryPressureMonitor()
    private init() {}

    // MARK: - Token Budget Tiers

    /// Maximum token budget under normal memory conditions.
    static let tokenBudgetGreen:  Int = 8_192
    /// Maximum token budget under yellow (warning) memory pressure.
    /// Restricts payload to: immediate cursor line + active tab title + last compile error.
    static let tokenBudgetYellow: Int = 2_048
    /// Maximum token budget under red (critical) memory pressure.
    static let tokenBudgetRed:    Int = 1_024

    // MARK: - Pressure Tiers

    enum PressureTier: String, Sendable {
        /// Normal: physical pages are abundant. Full context window permitted.
        case green  = "green"
        /// Warning: page-out rate is climbing. Restrict context aggressively.
        case yellow = "yellow"
        /// Critical: system is actively compressing/swapping. Minimal payload only.
        case red    = "red"
    }

    // MARK: - Kernel Query

    /// Samples `host_statistics64` for `HOST_VM_INFO64` to read live page counts.
    /// Returns a `PressureTier` based on the ratio of free+inactive pages to wired+active pages.
    var currentTier: PressureTier {
        var vmStats = vm_statistics64()
        var count = mach_msg_type_number_t(
            MemoryLayout<vm_statistics64>.size / MemoryLayout<integer_t>.size
        )

        let result: kern_return_t = withUnsafeMutablePointer(to: &vmStats) { ptr in
            ptr.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { reboundPtr in
                host_statistics64(
                    mach_host_self(),
                    HOST_VM_INFO64,
                    reboundPtr,
                    &count
                )
            }
        }

        guard result == KERN_SUCCESS else {
            print("[MemoryPressureMonitor] host_statistics64 failed (kern_return=\(result)). Defaulting to green.")
            return .green
        }

        let pageSize      = UInt64(vm_kernel_page_size)
        let freeBytes     = UInt64(vmStats.free_count)      * pageSize
        let inactiveBytes = UInt64(vmStats.inactive_count)  * pageSize
        let wiredBytes    = UInt64(vmStats.wire_count)      * pageSize
        let activeBytes   = UInt64(vmStats.active_count)    * pageSize

        let available = freeBytes + inactiveBytes
        let total     = available + wiredBytes + activeBytes

        guard total > 0 else { return .green }

        let availableRatio = Double(available) / Double(total)

        let tier: PressureTier
        switch availableRatio {
        case 0.35...:  tier = .green   // >35% free+inactive → healthy
        case 0.15...:  tier = .yellow  // 15–35% → warn, restrict payload
        default:       tier = .red     // <15% → critical, minimal payload
        }

        print("[MemoryPressureMonitor] Available ratio: \(String(format: "%.1f%%", availableRatio * 100)) → tier=\(tier.rawValue)")
        return tier
    }

    /// Returns the T_max token ceiling for the current memory pressure state.
    var currentBudget: Int {
        switch currentTier {
        case .green:  return Self.tokenBudgetGreen
        case .yellow: return Self.tokenBudgetYellow
        case .red:    return Self.tokenBudgetRed
        }
    }

    /// Returns a human-readable description of the active tier for logging/HUD display.
    var tierDescription: String {
        let tier = currentTier
        switch tier {
        case .green:  return "🟢 Green  (\(Self.tokenBudgetGreen) tokens)"
        case .yellow: return "🟡 Yellow (\(Self.tokenBudgetYellow) tokens — restricted)"
        case .red:    return "🔴 Red    (\(Self.tokenBudgetRed) tokens — critical)"
        }
    }
}
