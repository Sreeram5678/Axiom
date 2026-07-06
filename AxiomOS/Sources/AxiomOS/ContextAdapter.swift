import Foundation

/// A formal protocol representing standard requirements for dynamic third-party context extensions.
public protocol ContextAdapter: Sendable {
    var id: String { get }
    var name: String { get }
    var isEnabled: Bool { get }
    
    /// Optional lifecycle callback triggered on ambient state changes.
    func interceptContext()
    
    /// Returns relevant context strings for prompt enrichment based on active developer query.
    func retrieveContext(for query: String) -> [String]
}
