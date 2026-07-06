import Foundation

/// A thread-safe dynamic registry manager that manages active context adapters.
public final class ContextAdapterRegistry: @unchecked Sendable {
    public static let shared = ContextAdapterRegistry()
    
    private let queue = DispatchQueue(label: "com.axiom.axiomos.sdk.registry", qos: .userInitiated)
    private var adapters: [String: ContextAdapter] = [:]
    
    private init() {}
    
    /// Registers a custom adapter with the registry.
    public func registerAdapter(_ adapter: ContextAdapter) {
        queue.sync {
            adapters[adapter.id] = adapter
            print("[Axiom SDK] Registered context adapter: \(adapter.name) (\(adapter.id))")
        }
    }
    
    /// Unregisters an adapter.
    public func unregisterAdapter(id: String) {
        queue.sync {
            if let adapter = adapters.removeValue(forKey: id) {
                print("[Axiom SDK] Unregistered context adapter: \(adapter.name)")
            }
        }
    }
    
    /// Dispatches a context request to all active adapters.
    public func retrieveEnrichedContext(for query: String) -> [String] {
        return queue.sync {
            var results: [String] = []
            for adapter in adapters.values where adapter.isEnabled {
                let contextItems = adapter.retrieveContext(for: query)
                results.append(contentsOf: contextItems)
            }
            return results
        }
    }
    
    /// Triggers the intercept lifecycle event across all enabled adapters.
    public func triggerIntercept() {
        queue.sync {
            for adapter in adapters.values where adapter.isEnabled {
                adapter.interceptContext()
            }
        }
    }
}
