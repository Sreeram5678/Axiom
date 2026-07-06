import XCTest

// MARK: - Target Independent Mock of SDK interfaces

public protocol TestContextAdapter {
    var id: String { get }
    var name: String { get }
    var isEnabled: Bool { get }
    func retrieveContext(for query: String) -> [String]
}

struct TestMockDatabaseSchemaAdapter: TestContextAdapter {
    let id = "com.axiom.adapter.db-schema"
    let name = "Database Schema Dictionary Adapter"
    var isEnabled = true
    
    func retrieveContext(for query: String) -> [String] {
        let lower = query.lowercased()
        if lower.contains("user") || lower.contains("account") {
            return [
                "Table 'users' schema: id (INT, PK), email (VARCHAR), pwd_hash (VARCHAR)",
                "Table 'accounts' schema: id (INT, PK), user_id (INT, FK), balance (DECIMAL)"
            ]
        }
        return []
    }
}

public final class TestContextAdapterRegistry {
    public static let shared = TestContextAdapterRegistry()
    private var adapters: [String: TestContextAdapter] = [:]
    
    private init() {}
    
    public func registerAdapter(_ adapter: TestContextAdapter) {
        adapters[adapter.id] = adapter
    }
    
    public func unregisterAdapter(id: String) {
        adapters.removeValue(forKey: id)
    }
    
    public func retrieveEnrichedContext(for query: String) -> [String] {
        var results: [String] = []
        for adapter in adapters.values where adapter.isEnabled {
            let contextItems = adapter.retrieveContext(for: query)
            results.append(contentsOf: contextItems)
        }
        return results
    }
}

// MARK: - Unit Tests

final class ContextAdapterTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
        // Clear registry before each test
        TestContextAdapterRegistry.shared.unregisterAdapter(id: "com.axiom.adapter.db-schema")
    }
    
    func testAdapterRegistrationAndQuery() {
        let adapter = TestMockDatabaseSchemaAdapter()
        TestContextAdapterRegistry.shared.registerAdapter(adapter)
        
        let query = "Optimise query for user profile views"
        let context = TestContextAdapterRegistry.shared.retrieveEnrichedContext(for: query)
        
        XCTAssertEqual(context.count, 2)
        XCTAssertTrue(context[0].contains("Table 'users' schema"))
        XCTAssertTrue(context[1].contains("Table 'accounts' schema"))
    }
    
    func testDisabledAdapterIgnoresQueries() {
        var adapter = TestMockDatabaseSchemaAdapter()
        adapter.isEnabled = false
        TestContextAdapterRegistry.shared.registerAdapter(adapter)
        
        let query = "Query user logs"
        let context = TestContextAdapterRegistry.shared.retrieveEnrichedContext(for: query)
        
        XCTAssertEqual(context.count, 0)
    }
    
    func testUnregisteredAdapterIgnoresQueries() {
        let adapter = TestMockDatabaseSchemaAdapter()
        TestContextAdapterRegistry.shared.registerAdapter(adapter)
        TestContextAdapterRegistry.shared.unregisterAdapter(id: adapter.id)
        
        let query = "Retrieve user accounts"
        let context = TestContextAdapterRegistry.shared.retrieveEnrichedContext(for: query)
        
        XCTAssertEqual(context.count, 0)
    }
}
