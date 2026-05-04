package com.antikoala.wear.data

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

private const val APP_ID = "1:239731379993:web:6276a83da7ea3c1cc5bf88"

class FirebaseRepository {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    val currentUser get() = auth.currentUser

    suspend fun signIn(email: String, password: String) {
        auth.signInWithEmailAndPassword(email, password).await()
    }

    fun signOut() = auth.signOut()

    fun sessionsFlow(userId: String): Flow<List<DrinkingSession>> = callbackFlow {
        val ref = db.collection("artifacts/$APP_ID/users/$userId/drinking_sessions")
        val listener = ref.addSnapshotListener { snap, _ ->
            val list = snap?.documents?.mapNotNull { doc ->
                runCatching {
                    DrinkingSession(
                        id = doc.id,
                        eventName = doc.getString("eventName") ?: "",
                        counts = (doc.get("counts") as? Map<*, *>)
                            ?.mapNotNull { (k, v) ->
                                val key = k as? String ?: return@mapNotNull null
                                val value = (v as? Long) ?: (v as? Number)?.toLong() ?: 0L
                                key to value
                            }?.toMap() ?: emptyMap(),
                        startTime = doc.getTimestamp("startTime"),
                        endTime = doc.getTimestamp("endTime"),
                        createdAt = doc.getTimestamp("createdAt")
                    )
                }.getOrNull()
            }?.sortedByDescending { it.createdAt?.seconds } ?: emptyList()
            trySend(list)
        }
        awaitClose { listener.remove() }
    }

    fun sessionFlow(userId: String, sessionId: String): Flow<DrinkingSession?> = callbackFlow {
        val ref = db.document("artifacts/$APP_ID/users/$userId/drinking_sessions/$sessionId")
        val listener = ref.addSnapshotListener { snap, _ ->
            val session = snap?.let { doc ->
                runCatching {
                    DrinkingSession(
                        id = doc.id,
                        eventName = doc.getString("eventName") ?: "",
                        counts = (doc.get("counts") as? Map<*, *>)
                            ?.mapNotNull { (k, v) ->
                                val key = k as? String ?: return@mapNotNull null
                                val value = (v as? Long) ?: (v as? Number)?.toLong() ?: 0L
                                key to value
                            }?.toMap() ?: emptyMap(),
                        startTime = doc.getTimestamp("startTime"),
                        endTime = doc.getTimestamp("endTime"),
                        createdAt = doc.getTimestamp("createdAt")
                    )
                }.getOrNull()
            }
            trySend(session)
        }
        awaitClose { listener.remove() }
    }

    fun profileFlow(userId: String): Flow<UserProfile?> = callbackFlow {
        val ref = db.document("artifacts/$APP_ID/users/$userId/profile/user_data")
        val listener = ref.addSnapshotListener { snap, _ ->
            val profile = snap?.let { doc ->
                runCatching {
                    UserProfile(
                        name = doc.getString("name") ?: "",
                        gender = doc.getString("gender") ?: "male",
                        weight = (doc.get("weight") as? Number)?.toDouble() ?: 70.0,
                        capacity = (doc.get("capacity") as? Number)?.toDouble() ?: 2.0
                    )
                }.getOrNull()
            }
            trySend(profile)
        }
        awaitClose { listener.remove() }
    }

    suspend fun updateCounts(userId: String, sessionId: String, counts: Map<String, Long>) {
        db.document("artifacts/$APP_ID/users/$userId/drinking_sessions/$sessionId")
            .set(mapOf("counts" to counts), SetOptions.merge()).await()
    }

    suspend fun setStartTime(userId: String, sessionId: String) {
        db.document("artifacts/$APP_ID/users/$userId/drinking_sessions/$sessionId")
            .set(mapOf("startTime" to Timestamp.now()), SetOptions.merge()).await()
    }

    suspend fun setEndTime(userId: String, sessionId: String) {
        db.document("artifacts/$APP_ID/users/$userId/drinking_sessions/$sessionId")
            .set(mapOf("endTime" to Timestamp.now()), SetOptions.merge()).await()
    }

    suspend fun createSession(userId: String, eventName: String): String {
        val data = mapOf(
            "eventName" to eventName,
            "createdAt" to Timestamp.now(),
            "startTime" to null,
            "endTime" to null,
            "counts" to mapOf(
                "soju" to 0L, "beer" to 0L, "somac" to 0L,
                "whiskey" to 0L, "wine" to 0L, "makgeolli" to 0L, "highball" to 0L
            ),
            "peakPercentage" to null
        )
        val ref = db.collection("artifacts/$APP_ID/users/$userId/drinking_sessions")
            .add(data).await()
        return ref.id
    }
}
