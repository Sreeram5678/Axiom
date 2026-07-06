import Foundation
import SQLite3

// SQLITE_TRANSIENT_BINDING is a C macro (-1 cast to a function pointer type) that doesn't auto-bridge
// to Swift. Redefine it here as the standard Swift idiom.
fileprivate let SQLITE_TRANSIENT_BINDING = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

// MARK: - ContextGraph Schema Manager

/// Manages the local SQLite `context.db` Persistent Context Graph database.
/// Operates in WAL (Write-Ahead Logging) mode to enable concurrent reads during background writes.
/// Enforces strict foreign-key cascading so deleting a node prunes its related edges,
/// embeddings, and interaction records automatically.
final class ContextGraph: @unchecked Sendable {
    static let shared = ContextGraph()

    // Database handle — access guarded by `dbQueue`
    private var db: OpaquePointer?

    /// Serial queue that serializes ALL SQLite access, preventing SQLITE_BUSY races.
    let dbQueue = DispatchQueue(label: "com.axiom.axiomos.contextgraph.db", qos: .utility)

    // MARK: - Initialisation

    private init() {
        openDatabase()
        configureDatabase()
        createSchema()
    }

    // MARK: - Database Lifecycle

    private func openDatabase() {
        let dbURL = Self.databaseURL()
        let flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX
        if sqlite3_open_v2(dbURL.path, &db, flags, nil) != SQLITE_OK {
            let msg = String(cString: sqlite3_errmsg(db))
            print("[ContextGraph] CRITICAL: Failed to open database at \(dbURL.path): \(msg)")
        } else {
            print("[ContextGraph] Database opened at \(dbURL.path)")
        }
    }

    private func configureDatabase() {
        // WAL mode: allows concurrent readers while a single writer commits in the background.
        execute("PRAGMA journal_mode = WAL;")
        // Synchronous NORMAL: durable enough for a developer cache, avoids full fsync overhead.
        execute("PRAGMA synchronous = NORMAL;")
        // Enable foreign-key cascading (disabled by default in SQLite).
        execute("PRAGMA foreign_keys = ON;")
        // 8 MB page cache: keeps hot B-tree nodes in RAM, reducing I/O during context sweeps.
        execute("PRAGMA cache_size = -8192;")
        // Memory-mapped I/O for fast sequential scans.
        execute("PRAGMA mmap_size = 134217728;") // 128 MB mmap window
        print("[ContextGraph] Database pragmas configured (WAL, foreign_keys ON, 8 MB cache).")
    }

    // MARK: - Schema Creation

    private func createSchema() {
        // --- nodes ---
        // Each node is a unique semantic concept learned from user interactions.
        // `content_hash` prevents duplicates on identical content (deduplication key).
        execute("""
            CREATE TABLE IF NOT EXISTS nodes (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                content_hash    TEXT    NOT NULL UNIQUE,
                content         TEXT    NOT NULL,
                node_type       TEXT    NOT NULL DEFAULT 'context',
                source_domain   TEXT,
                created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
                last_accessed   INTEGER NOT NULL DEFAULT (unixepoch()),
                access_count    INTEGER NOT NULL DEFAULT 1
            );
        """)

        // --- edges ---
        // Directed co-occurrence edges between two nodes (semantic relationship graph).
        // Cascades: deleting either endpoint node removes all its edges.
        execute("""
            CREATE TABLE IF NOT EXISTS edges (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                source_node_id  INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
                target_node_id  INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
                relationship    TEXT    NOT NULL DEFAULT 'co-occurs',
                weight          REAL    NOT NULL DEFAULT 1.0,
                created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
                UNIQUE(source_node_id, target_node_id, relationship)
            );
        """)

        // --- embeddings ---
        // Stores the raw float32 vector blob for a node, produced by NLEmbedding.
        // One embedding per node (1-to-1). Cascades with node deletion.
        execute("""
            CREATE TABLE IF NOT EXISTS embeddings (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                node_id         INTEGER NOT NULL UNIQUE REFERENCES nodes(id) ON DELETE CASCADE,
                dimension       INTEGER NOT NULL,
                vector_blob     BLOB    NOT NULL,
                model_version   TEXT    NOT NULL DEFAULT 'NLEmbedding-1',
                created_at      INTEGER NOT NULL DEFAULT (unixepoch())
            );
        """)

        // --- interactions ---
        // Immutable audit log of raw user interactions (prompts sent, responses received).
        // Cascades: deleting a node removes its associated interaction records.
        execute("""
            CREATE TABLE IF NOT EXISTS interactions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                node_id         INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
                raw_prompt      TEXT    NOT NULL,
                mode_id         TEXT,
                response_length INTEGER,
                latency_ms      INTEGER,
                created_at      INTEGER NOT NULL DEFAULT (unixepoch())
            );
        """)

        // --- Indices for hot query paths ---
        // Cosine similarity sweeps scan all embeddings; covering index on node_id accelerates joins.
        execute("CREATE INDEX IF NOT EXISTS idx_embeddings_node ON embeddings(node_id);")
        // Context sweep filters by last_accessed TTL window.
        execute("CREATE INDEX IF NOT EXISTS idx_nodes_last_accessed ON nodes(last_accessed DESC);")
        // Edge traversal from a source node.
        execute("CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_node_id);")
        execute("CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_node_id);")
        // Interaction log sorted by time for efficient pruning queries.
        execute("CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC);")

        print("[ContextGraph] Schema initialised (nodes, edges, embeddings, interactions).")
    }

    // MARK: - Core Insert / Upsert

    /// Inserts or updates a context node by content hash. Returns the node's row ID.
    @discardableResult
    func upsertNode(
        contentHash: String,
        content: String,
        nodeType: String = "context",
        sourceDomain: String? = nil
    ) -> Int64 {
        let sql = """
            INSERT INTO nodes (content_hash, content, node_type, source_domain)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(content_hash) DO UPDATE SET
                last_accessed = unixepoch(),
                access_count  = access_count + 1
            RETURNING id;
        """
        var stmt: OpaquePointer?
        var rowId: Int64 = -1
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_text(stmt, 1, contentHash, -1, SQLITE_TRANSIENT_BINDING)
            sqlite3_bind_text(stmt, 2, content, -1, SQLITE_TRANSIENT_BINDING)
            sqlite3_bind_text(stmt, 3, nodeType, -1, SQLITE_TRANSIENT_BINDING)
            if let domain = sourceDomain {
                sqlite3_bind_text(stmt, 4, domain, -1, SQLITE_TRANSIENT_BINDING)
            } else {
                sqlite3_bind_null(stmt, 4)
            }
            if sqlite3_step(stmt) == SQLITE_ROW {
                rowId = sqlite3_column_int64(stmt, 0)
            }
        }
        sqlite3_finalize(stmt)
        return rowId
    }

    /// Inserts or strengthens a directed weighted edge between two nodes.
    func upsertEdge(sourceId: Int64, targetId: Int64, relationship: String = "co-occurs", weightDelta: Double = 1.0) {
        let sql = """
            INSERT INTO edges (source_node_id, target_node_id, relationship, weight)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(source_node_id, target_node_id, relationship) DO UPDATE SET
                weight = weight + ?;
        """
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_int64(stmt, 1, sourceId)
            sqlite3_bind_int64(stmt, 2, targetId)
            sqlite3_bind_text(stmt, 3, relationship, -1, SQLITE_TRANSIENT_BINDING)
            sqlite3_bind_double(stmt, 4, weightDelta)
            sqlite3_bind_double(stmt, 5, weightDelta)
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)
    }

    /// Stores a float32 embedding vector for a node. Replaces the existing record if present.
    func storeEmbedding(nodeId: Int64, vector: [Float], dimension: Int, modelVersion: String = "NLEmbedding-1") {
        let sql = """
            INSERT INTO embeddings (node_id, dimension, vector_blob, model_version)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(node_id) DO UPDATE SET
                vector_blob   = excluded.vector_blob,
                model_version = excluded.model_version,
                created_at    = unixepoch();
        """
        let blobData = vector.withUnsafeBytes { Data($0) }
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_int64(stmt, 1, nodeId)
            sqlite3_bind_int(stmt, 2, Int32(dimension))
            blobData.withUnsafeBytes { rawPtr in
                sqlite3_bind_blob(stmt, 3, rawPtr.baseAddress, Int32(blobData.count), SQLITE_TRANSIENT_BINDING)
            }
            sqlite3_bind_text(stmt, 4, modelVersion, -1, SQLITE_TRANSIENT_BINDING)
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)
    }

    /// Logs a raw interaction associated with a context node.
    func logInteraction(
        nodeId: Int64?,
        rawPrompt: String,
        modeId: String?,
        responseLength: Int?,
        latencyMs: Int?
    ) {
        let sql = """
            INSERT INTO interactions (node_id, raw_prompt, mode_id, response_length, latency_ms)
            VALUES (?, ?, ?, ?, ?);
        """
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            if let nid = nodeId { sqlite3_bind_int64(stmt, 1, nid) } else { sqlite3_bind_null(stmt, 1) }
            sqlite3_bind_text(stmt, 2, rawPrompt, -1, SQLITE_TRANSIENT_BINDING)
            if let m = modeId { sqlite3_bind_text(stmt, 3, m, -1, SQLITE_TRANSIENT_BINDING) } else { sqlite3_bind_null(stmt, 3) }
            if let r = responseLength { sqlite3_bind_int(stmt, 4, Int32(r)) } else { sqlite3_bind_null(stmt, 4) }
            if let l = latencyMs { sqlite3_bind_int(stmt, 5, Int32(l)) } else { sqlite3_bind_null(stmt, 5) }
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)
    }

    // MARK: - TTL Pruning

    /// Deletes nodes (and their cascaded edges, embeddings, interactions) not accessed
    /// within `ttlDays` days and whose access count is below `minAccessCount`.
    /// This is the primary mechanism for keeping the database lean on 8GB systems.
    func pruneStaleNodes(ttlDays: Int = 90, minAccessCount: Int = 2) {
        let cutoff = Int64(Date().timeIntervalSince1970) - Int64(ttlDays * 86400)
        let sql = """
            DELETE FROM nodes
            WHERE last_accessed < ?
              AND access_count < ?;
        """
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_int64(stmt, 1, cutoff)
            sqlite3_bind_int(stmt, 2, Int32(minAccessCount))
            sqlite3_step(stmt)
            let deleted = sqlite3_changes(db)
            if deleted > 0 {
                print("[ContextGraph] TTL pruning removed \(deleted) stale node(s).")
            }
        }
        sqlite3_finalize(stmt)
    }

    /// Runs VACUUM INCREMENTAL to reclaim freed pages without locking the DB for long periods.
    func vacuumIncremental(pages: Int = 100) {
        execute("PRAGMA incremental_vacuum(\(pages));")
    }

    // MARK: - Embedding Retrieval

    /// Fetches all stored embeddings as `(nodeId, vector)` pairs for similarity scanning.
    func fetchAllEmbeddings() -> [(nodeId: Int64, vector: [Float])] {
        let sql = "SELECT node_id, vector_blob FROM embeddings;"
        var stmt: OpaquePointer?
        var results: [(Int64, [Float])] = []
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            while sqlite3_step(stmt) == SQLITE_ROW {
                let nodeId = sqlite3_column_int64(stmt, 0)
                guard let blobPtr = sqlite3_column_blob(stmt, 1) else { continue }
                let byteCount = Int(sqlite3_column_bytes(stmt, 1))
                let floatCount = byteCount / MemoryLayout<Float>.size
                var vector = [Float](repeating: 0, count: floatCount)
                memcpy(&vector, blobPtr, byteCount)
                results.append((nodeId, vector))
            }
        }
        sqlite3_finalize(stmt)
        return results
    }

    /// Fetches the content of a node by its row ID.
    func fetchNodeContent(id: Int64) -> String? {
        let sql = "SELECT content FROM nodes WHERE id = ?;"
        var stmt: OpaquePointer?
        var content: String?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_int64(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW,
               let cStr = sqlite3_column_text(stmt, 0) {
                content = String(cString: cStr)
            }
        }
        sqlite3_finalize(stmt)
        return content
    }

    // MARK: - Helpers

    @discardableResult
    func execute(_ sql: String) -> Bool {
        var errorMsg: UnsafeMutablePointer<CChar>?
        let rc = sqlite3_exec(db, sql, nil, nil, &errorMsg)
        if rc != SQLITE_OK {
            let msg = errorMsg.map { String(cString: $0) } ?? "unknown error"
            print("[ContextGraph] SQL error (\(rc)): \(msg) — SQL: \(sql.prefix(120))")
            sqlite3_free(errorMsg)
            return false
        }
        return true
    }

    static func databaseURL() -> URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let axiomDir = appSupport.appendingPathComponent("AxiomOS", isDirectory: true)
        try? FileManager.default.createDirectory(at: axiomDir, withIntermediateDirectories: true)
        return axiomDir.appendingPathComponent("context.db")
    }
}
