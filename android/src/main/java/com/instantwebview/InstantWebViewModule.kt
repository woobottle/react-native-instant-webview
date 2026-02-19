package com.instantwebview

import android.view.View
import android.view.ViewGroup
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.UIManagerModule

class InstantWebViewModule(reactContext: ReactApplicationContext) :
    NativeInstantWebViewSpec(reactContext) {

    private val detachedViews = HashMap<Int, View>()

    override fun getName(): String = NAME

    @ReactMethod
    override fun detachView(tag: Double) {
        val viewTag = tag.toInt()
        UiThreadUtil.runOnUiThread {
            try {
                val uiManager = reactApplicationContext.getNativeModule(UIManagerModule::class.java)
                val view = uiManager?.resolveView(viewTag)
                if (view != null) {
                    val parent = view.parent as? ViewGroup
                    if (parent != null) {
                        detachedViews[viewTag] = view
                        parent.removeView(view)
                    }
                }
            } catch (e: Exception) {
                // View not found or already detached — graceful fallback handles this
            }
        }
    }

    @ReactMethod
    override fun attachView(tag: Double, parentTag: Double) {
        val viewTag = tag.toInt()
        val parentViewTag = parentTag.toInt()
        UiThreadUtil.runOnUiThread {
            try {
                val view = detachedViews[viewTag]
                val uiManager = reactApplicationContext.getNativeModule(UIManagerModule::class.java)
                val parent = uiManager?.resolveView(parentViewTag) as? ViewGroup
                if (view != null && parent != null) {
                    parent.addView(view)
                    detachedViews.remove(viewTag)
                }
            } catch (e: Exception) {
                // View not found — graceful fallback handles this
            }
        }
    }

    companion object {
        const val NAME = "InstantWebView"
    }
}
