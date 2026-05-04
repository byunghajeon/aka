package com.antikoala.wear

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

class AkaWearApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val options = FirebaseOptions.Builder()
            .setApiKey("AIzaSyBrVPLa0GkS5TvT7XHf3wyFJztb_D8Wt98")
            .setApplicationId("1:239731379993:android:217f4c28e32835b1c5bf88")
            .setProjectId("anti-koala")
            .setStorageBucket("anti-koala.firebasestorage.app")
            .setGcmSenderId("239731379993")
            .build()
        FirebaseApp.initializeApp(this, options)
    }
}
