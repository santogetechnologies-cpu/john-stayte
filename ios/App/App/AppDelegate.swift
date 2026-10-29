import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?
    private var lastRegisteredFcmToken: String?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Firebase SDK with bundled GoogleService-Info.plist
        FirebaseApp.configure()

        // Set Firebase Messaging delegate to receive authoritative FCM registration tokens
        Messaging.messaging().delegate = self

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused while the application was inactive.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    // Forward Apple APNs device token exclusively to Firebase Messaging
    // Note: Do NOT post raw APNs token data to Capacitor; Capacitor will receive the FCM registration token instead.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // Firebase Messaging Delegate: receives authoritative FCM registration token and token refreshes
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken, !fcmToken.isEmpty else { return }

        // Suppress duplicate events for the same token to prevent redundant server registration calls
        if fcmToken == lastRegisteredFcmToken {
            return
        }
        lastRegisteredFcmToken = fcmToken

        // Post the FCM token as a String to Capacitor's PushNotificationsPlugin observer
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: fcmToken)
    }
}

