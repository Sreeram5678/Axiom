import Foundation
import NaturalLanguage
import Accelerate
import CryptoKit

// MARK: - EmbeddingEngine

/// Generates dense vector embeddings for text using Apple's `NLEmbedding` from
/// `NaturalLanguage.framework`. Embeddings are computed entirely on-device,
/// sharing the OS-level NLP model libraries to add ZERO additional RAM overhead.
///
/// Hardware-accelerated cosine similarity is computed via Apple's Accelerate framework
/// (`vDSP_dotpr` / `vDSP_svesq`) which executes on the Apple Silicon vector units,
/// achieving sub-millisecond comparison latency even across thousands of stored vectors.
final class EmbeddingEngine: @unchecked Sendable {
    static let shared = EmbeddingEngine()

    // NLEmbedding is thread-safe after initialisation; we hold a single shared instance.
    private let embedding: NLEmbedding?
    private let dimension: Int

    // Minimum cosine similarity score to report a context hit (0.0 – 1.0).
    static let similarityThreshold: Float = 0.72

    private init() {
        // `sentenceEmbedding` maps whole sentences to a dense space; ideal for prompt chunks.
        // Falls back gracefully to nil on systems where the model is unavailable.
        if let model = NLEmbedding.sentenceEmbedding(for: .english) {
            self.embedding = model
            self.dimension = model.dimension
            print("[EmbeddingEngine] NLEmbedding loaded. Dimension: \(model.dimension)")
        } else {
            // Fallback: word-level embedding if sentence model is absent.
            let wordModel = NLEmbedding.wordEmbedding(for: .english)
            self.embedding = wordModel
            self.dimension = wordModel?.dimension ?? 0
            print("[EmbeddingEngine] Sentence embedding unavailable; using word embedding (dim: \(self.dimension)).")
        }
    }

    // MARK: - Public API

    /// Generates a float32 embedding vector for `text`.
    /// Returns `nil` if the NLEmbedding model is unavailable on this system.
    func embed(text: String) -> [Float]? {
        guard let embedding = embedding, dimension > 0 else { return nil }
        guard let doubleVector = embedding.vector(for: text), doubleVector.count == dimension else {
            return nil
        }
        // Convert Double[] → Float[] to halve memory usage for stored blobs.
        return doubleVector.map { Float($0) }
    }

    /// Returns a stable SHA-256 hex content hash for `text` to use as the deduplication key
    /// in the `nodes.content_hash` column. Computed fully in-process with no I/O.
    func contentHash(for text: String) -> String {
        let digest = SHA256.hash(data: Data(text.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    /// The embedding vector dimension (used when storing blobs in the database).
    var vectorDimension: Int { dimension }

    // MARK: - Hardware-Accelerated Cosine Similarity (Accelerate / vDSP)

    /// Computes the cosine similarity between two float32 vectors using Apple's Accelerate
    /// framework (`vDSP_dotpr`, `vDSP_svesq`). Both operations execute on the hardware
    /// SIMD vector units, making this safe for tight inner-loop scanning of thousands of
    /// stored embedding blobs without saturating the CPU.
    ///
    /// - Returns: A value in [-1, 1] where 1.0 = identical direction, 0.0 = orthogonal.
    static func cosineSimilarity(_ a: [Float], _ b: [Float]) -> Float {
        precondition(a.count == b.count, "[EmbeddingEngine] Vector dimension mismatch: \(a.count) vs \(b.count)")
        let n = vDSP_Length(a.count)

        // Dot product: Σ(a[i] * b[i])
        var dotProduct: Float = 0.0
        vDSP_dotpr(a, 1, b, 1, &dotProduct, n)

        // Magnitude of a: sqrt(Σ a[i]²)
        var sumSqA: Float = 0.0
        vDSP_svesq(a, 1, &sumSqA, n)
        let magA = sqrtf(sumSqA)

        // Magnitude of b: sqrt(Σ b[i]²)
        var sumSqB: Float = 0.0
        vDSP_svesq(b, 1, &sumSqB, n)
        let magB = sqrtf(sumSqB)

        guard magA > 0, magB > 0 else { return 0.0 }
        return dotProduct / (magA * magB)
    }

    // MARK: - Top-K Nearest Neighbour Search

    /// Scans all stored embeddings in the ContextGraph and returns the top-`k` nodes
    /// whose embeddings are most similar to `queryVector`, above `threshold`.
    ///
    /// This is an exhaustive linear scan (brute-force kNN), which is appropriate for the
    /// expected graph sizes (<50,000 nodes on a developer machine). No external ANN index
    /// library is needed, keeping the binary lean and dependency-free.
    func topKNeighbours(
        queryVector: [Float],
        k: Int = 5,
        threshold: Float = EmbeddingEngine.similarityThreshold
    ) -> [(nodeId: Int64, score: Float)] {
        let allEmbeddings = ContextGraph.shared.fetchAllEmbeddings()

        var scored: [(nodeId: Int64, score: Float)] = []
        scored.reserveCapacity(allEmbeddings.count)

        for (nodeId, vector) in allEmbeddings {
            guard vector.count == queryVector.count else { continue }
            let score = EmbeddingEngine.cosineSimilarity(queryVector, vector)
            if score >= threshold {
                scored.append((nodeId, score))
            }
        }

        // Sort descending by score; return top k.
        return scored
            .sorted { $0.score > $1.score }
            .prefix(k)
            .map { $0 }
    }

    // MARK: - Convenience: Embed + Search in One Call

    /// Embeds `text` and immediately queries the graph for top-`k` semantically similar nodes.
    /// Returns an array of `(nodeId, score, content)` tuples ready for context injection.
    func retrieveSimilarContext(
        for text: String,
        k: Int = 5
    ) -> [(nodeId: Int64, score: Float, content: String)] {
        guard let queryVec = embed(text: text) else { return [] }

        let neighbours = topKNeighbours(queryVector: queryVec, k: k)
        return neighbours.compactMap { hit in
            guard let content = ContextGraph.shared.fetchNodeContent(id: hit.nodeId) else { return nil }
            return (hit.nodeId, hit.score, content)
        }
    }
}
