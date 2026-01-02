// Authentication / User Selection
const AUTH_KEY = 'daily_helper_user';

// Get current user from localStorage
function getCurrentUser() {
    return localStorage.getItem(AUTH_KEY);
}

// Set current user
function setCurrentUser(username) {
    localStorage.setItem(AUTH_KEY, username);
}

// Clear current user (logout)
function logout() {
    localStorage.removeItem(AUTH_KEY);
    showLoginScreen();
}

// Show login screen, hide app
function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
}

// Show app, hide login screen
function showAppScreen() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');

    // Update user display
    const user = getCurrentUser();
    const userDisplays = document.querySelectorAll('#current-user, #welcome-name');
    userDisplays.forEach(el => {
        if (el) el.textContent = user;
    });
}

// Initialize auth on page load
function initAuth(onReady) {
    const user = getCurrentUser();

    if (user) {
        showAppScreen();
        if (onReady) onReady();
    } else {
        showLoginScreen();
    }

    // Setup profile button clicks
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.dataset.user;
            setCurrentUser(username);
            showAppScreen();
            if (onReady) onReady();
        });
    });

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}
