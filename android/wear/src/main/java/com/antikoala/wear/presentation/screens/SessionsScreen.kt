package com.antikoala.wear.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.antikoala.wear.data.DrinkingSession
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun SessionsScreen(
    sessions: List<DrinkingSession>,
    onSelectSession: (String) -> Unit,
    onSignOut: () -> Unit
) {
    val dateFormat = SimpleDateFormat("M/d", Locale.KOREA)

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        contentPadding = PaddingValues(vertical = 24.dp, horizontal = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        item {
            Text(
                text = "술자리 선택",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colors.primary
            )
        }

        if (sessions.isEmpty()) {
            item {
                Text(
                    text = "기록 없음\n앱에서 먼저 생성하세요",
                    fontSize = 11.sp,
                    color = Color(0xFF9CA3AF),
                    textAlign = TextAlign.Center
                )
            }
        } else {
            items(sessions.size) { idx ->
                val session = sessions[idx]
                val isActive = session.startTime != null && session.endTime == null
                val dateStr = session.createdAt?.toDate()?.let { dateFormat.format(it) } ?: ""

                Chip(
                    label = {
                        Text(
                            text = session.eventName,
                            fontSize = 13.sp,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    secondaryLabel = {
                        Text(
                            text = "$dateStr${if (isActive) " · 진행중" else ""}",
                            fontSize = 10.sp,
                            color = if (isActive) Color(0xFF10B981) else Color(0xFF9CA3AF)
                        )
                    },
                    onClick = { onSelectSession(session.id) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ChipDefaults.chipColors(
                        backgroundColor = if (isActive) Color(0xFF064E3B) else Color(0xFF1F2937)
                    )
                )
            }
        }

        item { Spacer(Modifier.height(4.dp)) }

        item {
            CompactChip(
                label = { Text("로그아웃", fontSize = 11.sp) },
                onClick = onSignOut,
                colors = ChipDefaults.chipColors(backgroundColor = Color(0xFF374151))
            )
        }
    }
}
