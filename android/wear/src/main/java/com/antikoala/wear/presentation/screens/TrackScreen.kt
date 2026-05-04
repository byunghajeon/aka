package com.antikoala.wear.presentation.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.antikoala.wear.data.DRINKS_LIST
import com.antikoala.wear.data.DrinkingSession
import com.antikoala.wear.data.DrinkStats
import com.antikoala.wear.data.UserProfile
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun TrackScreen(
    session: DrinkingSession,
    userProfile: UserProfile?,
    stats: DrinkStats?,
    onIncrement: (String) -> Unit,
    onDecrement: (String) -> Unit,
    onStart: () -> Unit,
    onEnd: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { DRINKS_LIST.size })
    val scope = rememberCoroutineScope()
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    Scaffold(
        timeText = { TimeText() }
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxSize()
                .onRotaryScrollEvent { event ->
                    scope.launch {
                        val target = if (event.verticalScrollPixels > 0)
                            (pagerState.currentPage + 1).coerceAtMost(DRINKS_LIST.size - 1)
                        else
                            (pagerState.currentPage - 1).coerceAtLeast(0)
                        pagerState.animateScrollToPage(target)
                    }
                    true
                }
                .focusRequester(focusRequester)
                .focusable()
        ) { page ->
            val (drinkKey, drinkInfo) = DRINKS_LIST[page]
            val count = (session.counts[drinkKey] ?: 0L).toInt()
            val hasStarted = session.startTime != null
            val hasEnded = session.endTime != null

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Session name
                Text(
                    text = session.eventName,
                    fontSize = 10.sp,
                    color = Color(0xFF9CA3AF),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(Modifier.height(2.dp))

                // Page indicator + drink name
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "${page + 1}/${DRINKS_LIST.size}",
                        fontSize = 10.sp,
                        color = Color(0xFF6B7280)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = drinkInfo.name,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Spacer(Modifier.height(4.dp))

                // Count
                Text(
                    text = "${count}잔",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colors.primary
                )

                Spacer(Modifier.height(8.dp))

                // +/- buttons
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = { onDecrement(drinkKey) },
                        enabled = hasStarted && count > 0,
                        modifier = Modifier.size(44.dp),
                        colors = ButtonDefaults.buttonColors(
                            backgroundColor = Color(0xFF374151),
                            disabledBackgroundColor = Color(0xFF1F2937)
                        )
                    ) {
                        Text("-", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onIncrement(drinkKey) },
                        enabled = hasStarted,
                        modifier = Modifier.size(44.dp),
                        colors = ButtonDefaults.buttonColors(
                            backgroundColor = MaterialTheme.colors.primary,
                            disabledBackgroundColor = Color(0xFF1F2937)
                        )
                    ) {
                        Text("+", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Stats row
                if (stats != null && stats.percentage > 0) {
                    Row(
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${stats.percentage.toInt()}%",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = percentageColor(stats.percentage)
                        )
                        if (stats.paceLabel.isNotEmpty()) {
                            Text(" · ", fontSize = 12.sp, color = Color(0xFF6B7280))
                            Text(
                                text = stats.paceLabel,
                                fontSize = 12.sp,
                                color = Color(stats.paceColorHex)
                            )
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                }

                // Start / End button
                when {
                    !hasStarted -> CompactChip(
                        label = { Text("시작", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                        onClick = onStart,
                        colors = ChipDefaults.chipColors(backgroundColor = Color(0xFF059669))
                    )
                    !hasEnded -> CompactChip(
                        label = { Text("종료", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                        onClick = onEnd,
                        colors = ChipDefaults.chipColors(backgroundColor = Color(0xFFDC2626))
                    )
                    else -> Text("완료됨", fontSize = 11.sp, color = Color(0xFF6B7280))
                }
            }
        }
    }
}

private fun percentageColor(pct: Double) = when {
    pct > 80 -> Color(0xFFEF4444)
    pct > 60 -> Color(0xFFF97316)
    pct > 40 -> Color(0xFFEAB308)
    pct > 20 -> Color(0xFF10B981)
    else     -> Color(0xFF3B82F6)
}
