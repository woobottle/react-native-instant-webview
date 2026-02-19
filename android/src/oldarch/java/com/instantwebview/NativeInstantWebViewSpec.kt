package com.instantwebview

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

abstract class NativeInstantWebViewSpec(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    abstract fun detachView(tag: Double)
    abstract fun attachView(tag: Double, parentTag: Double)
}
