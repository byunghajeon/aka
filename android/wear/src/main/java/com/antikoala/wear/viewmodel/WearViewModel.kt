package com.antikoala.wear.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antikoala.wear.data.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class AuthState(
    val isLoggedIn: Boolean = false,
    val userId: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

class WearViewModel : ViewModel() {
    private val repo = FirebaseRepository()

    private val _authState = MutableStateFlow(
        AuthState(
            isLoggedIn = repo.currentUser != null,
            userId = repo.currentUser?.uid
        )
    )
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _selectedSessionId = MutableStateFlow<String?>(null)

    val sessions: StateFlow<List<DrinkingSession>> = _authState
        .map { it.userId }
        .distinctUntilChanged()
        .flatMapLatest { uid ->
            if (uid != null) repo.sessionsFlow(uid) else flowOf(emptyList())
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val currentSession: StateFlow<DrinkingSession?> = combine(
        _authState.map { it.userId }.distinctUntilChanged(),
        _selectedSessionId
    ) { uid, sid -> uid to sid }
        .flatMapLatest { (uid, sid) ->
            if (uid != null && sid != null) repo.sessionFlow(uid, sid) else flowOf(null)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val userProfile: StateFlow<UserProfile?> = _authState
        .map { it.userId }
        .distinctUntilChanged()
        .flatMapLatest { uid ->
            if (uid != null) repo.profileFlow(uid) else flowOf(null)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val drinkStats: StateFlow<DrinkStats?> = combine(currentSession, userProfile) { session, profile ->
        computeStats(session, profile)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _authState.update { it.copy(isLoading = true, error = null) }
            runCatching { repo.signIn(email, password) }
                .onSuccess {
                    _authState.update {
                        it.copy(
                            isLoggedIn = true,
                            userId = repo.currentUser?.uid,
                            isLoading = false
                        )
                    }
                }
                .onFailure {
                    _authState.update { it.copy(isLoading = false, error = "로그인 실패") }
                }
        }
    }

    fun signOut() {
        repo.signOut()
        _authState.value = AuthState()
        _selectedSessionId.value = null
    }

    fun selectSession(sessionId: String) {
        _selectedSessionId.value = sessionId
    }

    fun increment(drinkKey: String) {
        val session = currentSession.value ?: return
        val uid = _authState.value.userId ?: return
        viewModelScope.launch {
            val newCounts = session.counts.toMutableMap()
            newCounts[drinkKey] = (newCounts[drinkKey] ?: 0L) + 1L
            repo.updateCounts(uid, session.id, newCounts)
        }
    }

    fun decrement(drinkKey: String) {
        val session = currentSession.value ?: return
        val uid = _authState.value.userId ?: return
        val current = session.counts[drinkKey] ?: 0L
        if (current <= 0L) return
        viewModelScope.launch {
            val newCounts = session.counts.toMutableMap()
            newCounts[drinkKey] = current - 1L
            repo.updateCounts(uid, session.id, newCounts)
        }
    }

    fun startSession() {
        val session = currentSession.value ?: return
        val uid = _authState.value.userId ?: return
        if (session.startTime != null) return
        viewModelScope.launch { repo.setStartTime(uid, session.id) }
    }

    fun endSession() {
        val session = currentSession.value ?: return
        val uid = _authState.value.userId ?: return
        if (session.startTime == null || session.endTime != null) return
        viewModelScope.launch { repo.setEndTime(uid, session.id) }
    }

    fun createSession(onCreated: (String) -> Unit) {
        val uid = _authState.value.userId ?: return
        val name = java.text.SimpleDateFormat("M/d 술자리", java.util.Locale.KOREA)
            .format(java.util.Date())
        viewModelScope.launch {
            val sessionId = repo.createSession(uid, name)
            _selectedSessionId.value = sessionId
            onCreated(sessionId)
        }
    }

    private fun computeStats(session: DrinkingSession?, profile: UserProfile?): DrinkStats? {
        if (session == null || profile == null) return null

        val totalGrams = DRINKS_LIST.sumOf { (key, info) ->
            (session.counts[key] ?: 0L).toDouble() * info.volume * info.abv * ALCOHOL_DENSITY
        }
        val capacityGrams = profile.capacity * SOJU_BOTTLE_ALCOHOL_GRAMS
        val percentage = if (capacityGrams > 0) (totalGrams / capacityGrams) * 100.0 else 0.0

        val start = session.startTime?.toDate() ?: return DrinkStats(percentage, "", 0xFF9CA3AF)
        val end = session.endTime?.toDate() ?: java.util.Date()
        val hours = (end.time - start.time) / 3_600_000.0
        if (hours < 1.0 / 6.0 || totalGrams == 0.0) return DrinkStats(percentage, "측정중", 0xFF9CA3AF)

        val currentPace = (totalGrams / SOJU_BOTTLE_ALCOHOL_GRAMS) / hours
        val normalPace = profile.capacity / 3.0
        val ratio = currentPace / normalPace

        val (label, colorHex) = when {
            ratio > 1.5 -> "매우빠름" to 0xFFEF4444L
            ratio > 1.2 -> "빠름"    to 0xFFF97316L
            ratio > 0.8 -> "적정"    to 0xFF10B981L
            else        -> "여유"    to 0xFF3B82F6L
        }
        return DrinkStats(percentage, label, colorHex)
    }
}
