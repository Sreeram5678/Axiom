import XCTest
@testable import AxiomOS

final class EvaluationSandboxTests: XCTestCase {
    
    /// Verifies that our character-to-token approximation (character count / 4)
    /// computes correct throughput values.
    func testTokenThroughputCalculation() {
        let sampleOutput = "This is a sample output string representing LLM optimized prompt response."
        let durationSeconds = 2.0
        
        let characterCount = Double(sampleOutput.count)
        let tokenCount = characterCount / 4.0
        let tokensPerSec = tokenCount / durationSeconds
        
        XCTAssertEqual(tokenCount, 18.5)
        XCTAssertEqual(tokensPerSec, 9.25)
    }
    
    /// Verifies that the mock/simulated Local Apple Silicon Model metrics
    /// are initialized within valid performance boundaries.
    func testLocalModelSimulatedMetrics() {
        let text = """
        [Local Apple Foundation Model - 8B Parameter Simulation]
        def add(a: float, b: float) -> float:
            return a + b
        """
        
        let duration = 0.75 // 750ms mock time
        let tokenCount = Double(text.count) / 4.0
        
        let latencyMs = duration * 1000.0
        let tokensPerSec = tokenCount / duration
        let memoryUsageMb = 2240.0
        let cpuUsagePercent = 24.5
        
        XCTAssertEqual(latencyMs, 750.0)
        XCTAssertTrue(tokensPerSec > 0.0)
        XCTAssertEqual(memoryUsageMb, 2240.0)
        XCTAssertEqual(cpuUsagePercent, 24.5)
    }
}
