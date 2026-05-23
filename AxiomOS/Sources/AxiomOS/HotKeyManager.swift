import Carbon
import Cocoa

class HotKeyManager {
    static let shared = HotKeyManager()
    
    private var hotKeys: [UInt32: EventHotKeyRef] = [:]
    
    // Callback closures for triggers
    var onTriggerHUD: (() -> Void)?
    var onTriggerDirectOptimize: (() -> Void)?
    var onTriggerDirectProofread: (() -> Void)?
    var onTriggerDirectRewrite: (() -> Void)?
    
    private init() {}
    
    func startListening() {
        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: OSType(kEventHotKeyPressed)
        )
        
        let handlerProc: EventHandlerProcPtr = { (nextHandler, event, userData) -> OSStatus in
            guard let event = event else { return OSStatus(eventNotHandledErr) }
            
            var hotKeyID = EventHotKeyID()
            let status = GetEventParameter(
                event,
                EventParamName(kEventParamDirectObject),
                EventParamType(typeEventHotKeyID),
                nil,
                MemoryLayout<EventHotKeyID>.size,
                nil,
                &hotKeyID
            )
            
            if status == noErr {
                let id = hotKeyID.id
                DispatchQueue.main.async {
                    HotKeyManager.shared.dispatch(id: id)
                }
                return noErr
            }
            return OSStatus(eventNotHandledErr)
        }
        
        InstallEventHandler(GetApplicationEventTarget(), handlerProc, 1, &eventType, nil, nil)
        
        // Modifiers: Control = 0x1000, Shift = 0x0200 -> Combined = 0x1200 (4608)
        let modifiers = UInt32(controlKey | shiftKey)
        
        // 1. Control+Shift+Space (Space bar virtual key code: 49)
        registerHotKey(id: 1, keyCode: 49, modifiers: modifiers)
        
        // 2. Control+Shift+O (O key virtual key code: 31)
        registerHotKey(id: 2, keyCode: 31, modifiers: modifiers)
        
        // 3. Control+Shift+P (P key virtual key code: 35)
        registerHotKey(id: 3, keyCode: 35, modifiers: modifiers)
        
        // 4. Control+Shift+R (R key virtual key code: 15)
        registerHotKey(id: 4, keyCode: 15, modifiers: modifiers)
        
        print("[AxiomOS HotKey] Native Carbon global hotkey hooks established successfully!")
    }
    
    private func registerHotKey(id: UInt32, keyCode: UInt32, modifiers: UInt32) {
        // "AXOS" FourCharCode is 1096118099
        let hotKeyID = EventHotKeyID(signature: OSType(1096118099), id: id)
        var hotKeyRef: EventHotKeyRef?
        
        let status = RegisterEventHotKey(
            keyCode,
            modifiers,
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )
        
        if status == noErr, let ref = hotKeyRef {
            hotKeys[id] = ref
        } else {
            print("[AxiomOS HotKey] Failed to register hotkey ID \(id): Status code \(status)")
        }
    }
    
    private func dispatch(id: UInt32) {
        switch id {
        case 1:
            onTriggerHUD?()
        case 2:
            onTriggerDirectOptimize?()
        case 3:
            onTriggerDirectProofread?()
        case 4:
            onTriggerDirectRewrite?()
        default:
            break
        }
    }
}
