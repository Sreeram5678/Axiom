import Cocoa
import CoreGraphics

/// Safely captures and downsamples screenshots of the frontmost developer application window.
/// Enforces strict 8GB RAM system memory boundaries by dynamically adjusting image dimensions
/// and JPEG compression coefficients based on live memory pressure feedback.
final class WindowCapturer: @unchecked Sendable {
    static let shared = WindowCapturer()
    
    private init() {}
    
    /// Captures the active window of the frontmost application.
    /// Resizes and compresses the result based on the current memory pressure tier.
    /// Returns a Base64-encoded JPEG image string, or nil if capture fails or permissions are missing.
    func captureFrontmostWindow() -> String? {
        guard let frontmostApp = NSWorkspace.shared.frontmostApplication else {
            print("[WindowCapturer] No active frontmost application detected.")
            return nil
        }
        
        let pid = frontmostApp.processIdentifier
        print("[WindowCapturer] Frontmost App: \(frontmostApp.localizedName ?? "Unknown") (PID: \(pid))")
        
        // 1. Locate the window belonging to the frontmost application
        guard let windowID = findWindowID(forPID: pid) else {
            print("[WindowCapturer] Could not locate window ID for PID \(pid). Falling back to full screen bounds.")
            return captureScreenBounds(maxDimension: currentMaxDimension(), quality: currentCompressionQuality())
        }
        
        // 2. Capture the window image
        guard let cgImage = CGWindowListCreateImage(
            .null,
            .optionIncludingWindow,
            windowID,
            .boundsIgnoreFraming
        ) else {
            print("[WindowCapturer] CGWindowListCreateImage returned nil. Standard Screen Recording permissions might be missing.")
            return nil
        }
        
        // 3. Process image based on memory state
        let maxDim = currentMaxDimension()
        let quality = currentCompressionQuality()
        
        return processAndEncodeImage(cgImage, maxDimension: maxDim, quality: quality)
    }
    
    // MARK: - Memory Parameter Selection
    
    private func currentMaxDimension() -> CGFloat {
        switch MemoryPressureMonitor.shared.currentTier {
        case .green:
            return 1280.0
        case .yellow, .red:
            return 512.0
        }
    }
    
    private func currentCompressionQuality() -> Double {
        switch MemoryPressureMonitor.shared.currentTier {
        case .green:
            return 0.85
        case .yellow, .red:
            return 0.60
        }
    }
    
    // MARK: - Image Operations & Resizing
    
    private func processAndEncodeImage(_ image: CGImage, maxDimension: CGFloat, quality: Double) -> String? {
        let width = CGFloat(image.width)
        let height = CGFloat(image.height)
        
        var targetImage = image
        
        // If image exceeds max boundaries, downsample it to fit our RAM budget
        if width > maxDimension || height > maxDimension {
            let scale = min(maxDimension / width, maxDimension / height)
            let newWidth = Int(width * scale)
            let newHeight = Int(height * scale)
            
            guard let colorSpace = image.colorSpace,
                  let context = CGContext(
                      data: nil,
                      width: newWidth,
                      height: newHeight,
                      bitsPerComponent: image.bitsPerComponent,
                      bytesPerRow: 0,
                      space: colorSpace,
                      bitmapInfo: image.bitmapInfo.rawValue
                  ) else {
                return nil
            }
            
            context.interpolationQuality = .medium
            context.draw(image, in: CGRect(x: 0, y: 0, width: newWidth, height: newHeight))
            
            if let scaledImage = context.makeImage() {
                targetImage = scaledImage
                print("[WindowCapturer] Resized screenshot from \(Int(width))x\(Int(height)) to \(newWidth)x\(newHeight)")
            }
        }
        
        // Convert CGImage → JPEG Data → Base64 String
        let nsImage = NSImage(cgImage: targetImage, size: NSSize(width: targetImage.width, height: targetImage.height))
        guard let tiffData = nsImage.tiffRepresentation,
              let bitmapRep = NSBitmapImageRep(data: tiffData),
              let jpegData = bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: quality]) else {
            return nil
        }
        
        print("[WindowCapturer] Encoded image to JPEG size: \(jpegData.count) bytes (quality: \(Int(quality * 100))%)")
        return jpegData.base64EncodedString()
    }
    
    // MARK: - Window Fetch Helpers
    
    private func findWindowID(forPID pid: pid_t) -> CGWindowID? {
        let options = CGWindowListOption.optionOnScreenOnly
        guard let infoList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
            return nil
        }
        
        for info in infoList {
            guard let ownerPID = info[kCGWindowOwnerPID as String] as? pid_t,
                  ownerPID == pid,
                  let windowNumber = info[kCGWindowNumber as String] as? CGWindowID,
                  let boundsDict = info[kCGWindowBounds as String] as? [String: Any],
                  let height = boundsDict["Height"] as? CGFloat, height > 100 // Filter out status item menus and popups
            else {
                continue
            }
            return windowNumber
        }
        
        return nil
    }
    
    private func captureScreenBounds(maxDimension: CGFloat, quality: Double) -> String? {
        // Fallback: capture main screen bounds if single window fetch fails
        guard let mainDisplayImage = CGDisplayCreateImage(CGMainDisplayID()) else {
            return nil
        }
        return processAndEncodeImage(mainDisplayImage, maxDimension: maxDimension, quality: quality)
    }
}
