package com.antikoala.wear.presentation.screens

import android.app.Activity
import android.app.RemoteInput
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import androidx.wear.input.RemoteInputIntentHelper

@Composable
fun AuthScreen(
    isLoading: Boolean,
    error: String?,
    onSignIn: (String, String) -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val emailLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            email = RemoteInput.getResultsFromIntent(result.data)
                ?.getCharSequence("email")?.toString() ?: email
        }
    }

    val passwordLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            password = RemoteInput.getResultsFromIntent(result.data)
                ?.getCharSequence("password")?.toString() ?: password
        }
    }

    fun launchInput(label: String, key: String, launcher: ActivityResultLauncher<Intent>) {
        val intent = RemoteInputIntentHelper.createActionRemoteInputIntent() ?: return
        RemoteInputIntentHelper.putRemoteInputsExtra(
            intent,
            listOf(RemoteInput.Builder(key).setLabel(label).build())
        )
        launcher.launch(intent)
    }

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        contentPadding = PaddingValues(vertical = 24.dp, horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text(
                text = "🐨 안티코알라",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colors.primary,
                textAlign = TextAlign.Center
            )
        }

        item {
            Chip(
                label = {
                    Text(
                        text = if (email.isEmpty()) "이메일 입력" else email,
                        fontSize = 11.sp,
                        maxLines = 1
                    )
                },
                onClick = { launchInput("이메일", "email", emailLauncher) },
                modifier = Modifier.fillMaxWidth(),
                colors = ChipDefaults.chipColors(
                    backgroundColor = if (email.isEmpty()) Color(0xFF374151) else Color(0xFF064E3B)
                )
            )
        }

        item {
            Chip(
                label = {
                    Text(
                        text = if (password.isEmpty()) "비밀번호 입력" else "●".repeat(password.length.coerceAtMost(8)),
                        fontSize = 11.sp,
                        maxLines = 1
                    )
                },
                onClick = { launchInput("비밀번호", "password", passwordLauncher) },
                modifier = Modifier.fillMaxWidth(),
                colors = ChipDefaults.chipColors(
                    backgroundColor = if (password.isEmpty()) Color(0xFF374151) else Color(0xFF064E3B)
                )
            )
        }

        item {
            Button(
                onClick = { if (email.isNotEmpty() && password.isNotEmpty()) onSignIn(email, password) },
                enabled = email.isNotEmpty() && password.isNotEmpty() && !isLoading,
                modifier = Modifier.size(ButtonDefaults.DefaultButtonSize),
                colors = ButtonDefaults.buttonColors(backgroundColor = MaterialTheme.colors.primary)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        indicatorColor = Color.White
                    )
                } else {
                    Text("로그인", fontSize = 13.sp)
                }
            }
        }

        if (error != null) {
            item {
                Text(
                    text = error,
                    fontSize = 11.sp,
                    color = MaterialTheme.colors.error,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
