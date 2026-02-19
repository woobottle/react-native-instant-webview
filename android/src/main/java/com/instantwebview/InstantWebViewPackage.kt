package com.instantwebview

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class InstantWebViewPackage : TurboReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == InstantWebViewModule.NAME) {
            InstantWebViewModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                InstantWebViewModule.NAME to ReactModuleInfo(
                    InstantWebViewModule.NAME,
                    InstantWebViewModule.NAME,
                    false,
                    false,
                    false,
                    false,
                    BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
                )
            )
        }
    }
}
