package com.antikoala.wear

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

class AkaWearApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val options = FirebaseOptions.Builder()
            .setApiKey(BuildConfig.FIREBASE_API_KEY)
            .setApplicationId(BuildConfig.FIREBASE_APP_ID)
            .setProjectId(BuildConfig.FIREBASE_PROJECT_ID)
            .setStorageBucket(BuildConfig.FIREBASE_STORAGE_BUCKET)
            .setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
            .build()
        FirebaseApp.initializeApp(this, options)
    }
}
