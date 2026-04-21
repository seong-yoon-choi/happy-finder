import Capacitor
import UIKit

class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginType(AppNotificationSettingsPlugin.self)
    }
}

@objc(AppNotificationSettingsPlugin)
public class AppNotificationSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppNotificationSettingsPlugin"
    public let jsName = "AppNotificationSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    @objc public func open(_ call: CAPPluginCall) {
        guard let settingsUrl = URL(string: UIApplication.openSettingsURLString) else {
            call.reject("Unable to resolve app settings URL.")
            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(settingsUrl) { success in
                success ? call.resolve() : call.reject("Unable to open app notification settings.")
            }
        }
    }
}
