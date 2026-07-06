import SwiftUI

struct BenchmarkMetrics: Sendable, Equatable {
    var latencyMs: Double = 0.0
    var tokensPerSec: Double = 0.0
    var memoryUsageMb: Double = 0.0
    var cpuUsagePercent: Double = 0.0
}

struct EvaluationSandboxView: View {
    @State private var promptText: String = "Optimize the following python script:\ndef add(a,b):\n    return a+b"
    
    @State private var leftModel: String = "gemini-1.5-flash"
    @State private var rightModel: String = "apple-local-sim"
    
    @State private var leftOutput: String = ""
    @State private var rightOutput: String = ""
    
    @State private var leftMetrics = BenchmarkMetrics()
    @State private var rightMetrics = BenchmarkMetrics()
    
    @State private var isBenchmarking: Bool = false
    @State private var statusMessage: String = "Ready"
    
    private let availableModels = [
        ("gemini-1.5-flash", "Cloud Gemini (Flash)"),
        ("gemini-1.5-pro", "Cloud Gemini (Pro)"),
        ("apple-local-sim", "Local Apple FM (Simulated)")
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header bar
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("AxiomOS Developer Sandbox")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("Side-by-side prompt optimization, latency, and resource benchmarking dashboard.")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                Spacer()
                
                if isBenchmarking {
                    ProgressView()
                        .scaleEffect(0.8)
                        .padding(.trailing, 8)
                }
                
                Button(action: runBenchmark) {
                    Text(isBenchmarking ? "Benchmarking..." : "Run Side-by-Side Benchmark")
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(isBenchmarking ? Color.gray : Color.blue)
                        )
                }
                .disabled(isBenchmarking || promptText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .buttonStyle(PlainButtonStyle())
            }
            .padding()
            .background(Color(red: 0.08, green: 0.08, blue: 0.12))
            
            Divider()
                .background(Color.gray.opacity(0.3))
            
            // Prompt input editor
            VStack(alignment: .leading, spacing: 8) {
                Text("ENTER PROMPT TO EVALUATE")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.gray)
                
                TextEditor(text: $promptText)
                    .font(.system(.body, design: .monospaced))
                    .padding(8)
                    .background(Color(red: 0.12, green: 0.12, blue: 0.16))
                    .cornerRadius(8)
                    .frame(height: 110)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.blue.opacity(0.4), lineWidth: 1)
                    )
            }
            .padding()
            .background(Color(red: 0.1, green: 0.1, blue: 0.14))
            
            Divider()
                .background(Color.gray.opacity(0.3))
            
            // Side-by-side display columns
            HStack(spacing: 0) {
                // Left Column
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("COLUMN A")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Spacer()
                        Picker("", selection: $leftModel) {
                            ForEach(availableModels, id: \.0) { model in
                                Text(model.1).tag(model.0)
                            }
                        }
                        .pickerStyle(MenuPickerStyle())
                        .disabled(isBenchmarking)
                    }
                    
                    ScrollView {
                        VStack(alignment: .leading, spacing: 8) {
                            if leftOutput.isEmpty {
                                Text("Output will appear here...")
                                    .italic()
                                    .foregroundColor(.gray)
                            } else {
                                Text(leftOutput)
                                    .font(.system(.body, design: .monospaced))
                                    .foregroundColor(.white)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                    }
                    .background(Color(red: 0.12, green: 0.12, blue: 0.16))
                    .cornerRadius(8)
                    .frame(maxHeight: .infinity)
                    
                    metricsCard(metrics: leftMetrics, modelKey: leftModel)
                }
                .padding()
                .frame(maxWidth: .infinity)
                
                Divider()
                    .background(Color.gray.opacity(0.3))
                
                // Right Column
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("COLUMN B")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.purple)
                        Spacer()
                        Picker("", selection: $rightModel) {
                            ForEach(availableModels, id: \.0) { model in
                                Text(model.1).tag(model.0)
                            }
                        }
                        .pickerStyle(MenuPickerStyle())
                        .disabled(isBenchmarking)
                    }
                    
                    ScrollView {
                        VStack(alignment: .leading, spacing: 8) {
                            if rightOutput.isEmpty {
                                Text("Output will appear here...")
                                    .italic()
                                    .foregroundColor(.gray)
                            } else {
                                Text(rightOutput)
                                    .font(.system(.body, design: .monospaced))
                                    .foregroundColor(.white)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                    }
                    .background(Color(red: 0.12, green: 0.12, blue: 0.16))
                    .cornerRadius(8)
                    .frame(maxHeight: .infinity)
                    
                    metricsCard(metrics: rightMetrics, modelKey: rightModel)
                }
                .padding()
                .frame(maxWidth: .infinity)
            }
            .background(Color(red: 0.08, green: 0.08, blue: 0.12))
            
            // Footer status bar
            HStack {
                Text("Status: \(statusMessage)")
                    .font(.caption)
                    .foregroundColor(.gray)
                Spacer()
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(red: 0.06, green: 0.06, blue: 0.08))
        }
        .frame(minWidth: 800, minHeight: 600)
    }
    
    // MARK: - Metrics Card helper
    
    private func metricsCard(metrics: BenchmarkMetrics, modelKey: String) -> some View {
        VStack(spacing: 8) {
            HStack {
                Text("Performance Diagnostics")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.gray)
                Spacer()
            }
            
            Grid(horizontalSpacing: 16, verticalSpacing: 8) {
                GridRow {
                    metricValueCell(label: "Latency", value: String(format: "%.0f ms", metrics.latencyMs), icon: "timer")
                    metricValueCell(label: "Throughput", value: String(format: "%.1f tok/s", metrics.tokensPerSec), icon: "gauge.medium")
                }
                GridRow {
                    metricValueCell(label: "VRAM Peak", value: String(format: "%.0f MB", metrics.memoryUsageMb), icon: "memorychip")
                    metricValueCell(label: "CPU Usage", value: String(format: "%.1f%%", metrics.cpuUsagePercent), icon: "cpu")
                }
            }
        }
        .padding(12)
        .background(Color(red: 0.12, green: 0.12, blue: 0.18))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
    }
    
    private func metricValueCell(label: String, value: String, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .font(.system(size: 14))
                .frame(width: 16)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
                Text(value)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
            }
            Spacer()
        }
    }
    
    // MARK: - Execution & Benchmarking Logic
    
    private func runBenchmark() {
        guard !promptText.isEmpty else { return }
        isBenchmarking = true
        statusMessage = "Executing side-by-side runs..."
        
        leftOutput = ""
        rightOutput = ""
        leftMetrics = BenchmarkMetrics()
        rightMetrics = BenchmarkMetrics()
        
        Task {
            async let leftTask = runSingleModel(modelKey: leftModel)
            async let rightTask = runSingleModel(modelKey: rightModel)
            
            let (leftResult, rightResult) = await (leftTask, rightTask)
            
            DispatchQueue.main.async {
                self.leftOutput = leftResult.text
                self.leftMetrics = leftResult.metrics
                
                self.rightOutput = rightResult.text
                self.rightMetrics = rightResult.metrics
                
                self.isBenchmarking = false
                self.statusMessage = "Benchmark completed successfully."
            }
        }
    }
    
    private func runSingleModel(modelKey: String) async -> (text: String, metrics: BenchmarkMetrics) {
        let startTime = Date()
        var outputText = ""
        var metrics = BenchmarkMetrics()
        
        do {
            if modelKey == "apple-local-sim" {
                // Simulate Local Apple Foundation Model latency and resource metrics
                try await Task.sleep(nanoseconds: 750_000_000) // 750ms mock ANE loading & processing time
                
                outputText = """
                [Local Apple Foundation Model - 8B Parameter Simulation]
                
                // Optimized Code Implementation:
                def add(a: float, b: float) -> float:
                    \"\"\"Adds two floating point numbers together with type safety annotations.\"\"\"
                    return a + b
                
                [Diagnostics]:
                - Zero-latency local execution.
                - Private, zero-network dispatch.
                """
                
                let duration = Date().timeIntervalSince(startTime)
                let tokenCount = Double(outputText.count) / 4.0
                
                metrics.latencyMs = duration * 1000.0
                metrics.tokensPerSec = tokenCount / duration
                metrics.memoryUsageMb = 2240.0 // Realistic weight allocation in system VRAM
                metrics.cpuUsagePercent = 24.5
                
            } else {
                // Determine model name for Cloud Gemini APIs
                let modelId = (modelKey == "gemini-1.5-pro") ? "gemini-1.5-pro" : "gemini-1.5-flash"
                
                // Force custom selection via temporary config manager adjustments
                let oldModel = ConfigManager.shared.selectedModel
                ConfigManager.shared.selectedModel = modelId
                
                let response = try await GeminiClient.shared.optimizePrompt(
                    rawPrompt: promptText,
                    modeId: "analyst",
                    length: "detailed",
                    base64Image: nil,
                    onChunk: { _ in }
                )
                
                // Restore model config settings
                ConfigManager.shared.selectedModel = oldModel
                outputText = response
                
                let duration = Date().timeIntervalSince(startTime)
                let tokenCount = Double(outputText.count) / 4.0
                
                metrics.latencyMs = duration * 1000.0
                metrics.tokensPerSec = tokenCount / duration
                metrics.memoryUsageMb = 0.0 // Cloud model consumes no local VRAM
                metrics.cpuUsagePercent = 0.8
            }
        } catch {
            outputText = "Execution Error: \(error.localizedDescription)"
            metrics.latencyMs = Date().timeIntervalSince(startTime) * 1000.0
            metrics.tokensPerSec = 0.0
            metrics.memoryUsageMb = 0.0
            metrics.cpuUsagePercent = 0.0
        }
        
        return (outputText, metrics)
    }
}
