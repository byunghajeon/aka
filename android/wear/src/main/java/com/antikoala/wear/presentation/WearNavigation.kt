package com.antikoala.wear.presentation

import androidx.compose.runtime.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.antikoala.wear.presentation.screens.AuthScreen
import com.antikoala.wear.presentation.screens.SessionsScreen
import com.antikoala.wear.presentation.screens.TrackScreen
import com.antikoala.wear.viewmodel.WearViewModel

@Composable
fun WearNavigation(viewModel: WearViewModel) {
    val authState by viewModel.authState.collectAsStateWithLifecycle()
    val navController = rememberSwipeDismissableNavController()

    // React to login/logout state changes
    LaunchedEffect(authState.isLoggedIn) {
        if (authState.isLoggedIn) {
            navController.navigate("sessions") {
                popUpTo("auth") { inclusive = true }
            }
        } else {
            navController.navigate("auth") {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    SwipeDismissableNavHost(
        navController = navController,
        startDestination = if (authState.isLoggedIn) "sessions" else "auth"
    ) {
        composable("auth") {
            AuthScreen(
                isLoading = authState.isLoading,
                error = authState.error,
                onSignIn = viewModel::signIn
            )
        }

        composable("sessions") {
            val sessions by viewModel.sessions.collectAsStateWithLifecycle()
            SessionsScreen(
                sessions = sessions,
                onSelectSession = { sessionId ->
                    viewModel.selectSession(sessionId)
                    navController.navigate("track/$sessionId")
                },
                onSignOut = viewModel::signOut
            )
        }

        composable(
            route = "track/{sessionId}",
            arguments = listOf(navArgument("sessionId") { type = NavType.StringType })
        ) {
            val session by viewModel.currentSession.collectAsStateWithLifecycle()
            val profile by viewModel.userProfile.collectAsStateWithLifecycle()
            val stats by viewModel.drinkStats.collectAsStateWithLifecycle()

            session?.let { s ->
                TrackScreen(
                    session = s,
                    userProfile = profile,
                    stats = stats,
                    onIncrement = viewModel::increment,
                    onDecrement = viewModel::decrement,
                    onStart = viewModel::startSession,
                    onEnd = viewModel::endSession,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
