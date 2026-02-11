package com.secretapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    
    // Initialize the WebRTC module options.
    val options = com.oney.WebRTCModule.WebRTCModuleOptions.getInstance()
    options.enableMediaProjectionService = true
    
    val audioAttributes = android.media.AudioAttributes.Builder()
      .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
      .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
      .build()
      
    options.audioDeviceModule = org.webrtc.audio.JavaAudioDeviceModule.builder(this)
      .setAudioAttributes(audioAttributes)
      .createAudioDeviceModule()

    loadReactNative(this)
  }
}
