package com.antikoala.wear.presentation.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.Colors
import androidx.wear.compose.material.MaterialTheme

private val WearColors = Colors(
    primary = Color(0xFF10B981),
    primaryVariant = Color(0xFF059669),
    secondary = Color(0xFF34D399),
    background = Color(0xFF000000),
    surface = Color(0xFF1F2937),
    error = Color(0xFFEF4444),
    onPrimary = Color.White,
    onSecondary = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White,
    onError = Color.White
)

@Composable
fun AkaWearTheme(content: @Composable () -> Unit) {
    MaterialTheme(colors = WearColors, content = content)
}
