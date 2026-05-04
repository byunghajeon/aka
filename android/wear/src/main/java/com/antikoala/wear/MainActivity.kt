package com.antikoala.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import com.antikoala.wear.presentation.WearNavigation
import com.antikoala.wear.presentation.theme.AkaWearTheme
import com.antikoala.wear.viewmodel.WearViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AkaWearTheme {
                val vm: WearViewModel = viewModel()
                WearNavigation(viewModel = vm)
            }
        }
    }
}
