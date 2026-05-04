package com.antikoala.wear.data

import com.google.firebase.Timestamp

data class DrinkInfo(val name: String, val volume: Int, val abv: Double)

val DRINKS_LIST: List<Pair<String, DrinkInfo>> = listOf(
    "soju"      to DrinkInfo("소주",   50,  0.169),
    "beer"      to DrinkInfo("맥주",  200,  0.05),
    "somac"     to DrinkInfo("소맥",  200,  0.09),
    "whiskey"   to DrinkInfo("위스키", 30,  0.42),
    "wine"      to DrinkInfo("와인",  100,  0.13),
    "makgeolli" to DrinkInfo("막걸리", 150, 0.06),
    "highball"  to DrinkInfo("하이볼", 300, 0.08),
)

const val ALCOHOL_DENSITY = 0.789
const val BAC_ELIMINATION_RATE = 0.015
val SOJU_BOTTLE_ALCOHOL_GRAMS = 360.0 * 0.169 * ALCOHOL_DENSITY

data class DrinkingSession(
    val id: String = "",
    val eventName: String = "",
    val counts: Map<String, Long> = emptyMap(),
    val startTime: Timestamp? = null,
    val endTime: Timestamp? = null,
    val createdAt: Timestamp? = null
)

data class UserProfile(
    val name: String = "",
    val gender: String = "male",
    val weight: Double = 70.0,
    val capacity: Double = 2.0
)

data class DrinkStats(
    val percentage: Double,
    val paceLabel: String,
    val paceColorHex: Long
)
