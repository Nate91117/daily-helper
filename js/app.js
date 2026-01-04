// Dashboard / Home Page Logic

async function loadDashboard() {
    const user = getCurrentUser();
    if (!user) return;

    await Promise.all([
        loadHabitStats(),
        loadStretchStats(),
        loadBookStats(),
        loadQuickHabits()
    ]);
}

async function loadHabitStats() {
    const user = getCurrentUser();
    const today = getToday();

    try {
        // Get all habits for user
        const { data: habits, error } = await db
            .from('habits')
            .select('id')
            .eq('user_name', user);

        if (error) throw error;

        const totalHabits = habits ? habits.length : 0;

        // Get completions for today
        let completedToday = 0;
        if (habits && habits.length > 0) {
            const habitIds = habits.map(h => h.id);
            const { data: completions, error: compError } = await db
                .from('habit_completions')
                .select('id')
                .in('habit_id', habitIds)
                .eq('completed_date', today);

            if (!compError) {
                completedToday = completions ? completions.length : 0;
            }
        }

        document.getElementById('habits-completed').textContent = completedToday;
        document.getElementById('habits-total').textContent = totalHabits;
    } catch (err) {
        console.error('Error loading habit stats:', err);
    }
}

async function loadStretchStats() {
    const user = getCurrentUser();
    const today = getToday();

    try {
        const { data: stretches, error } = await db
            .from('stretches')
            .select('id')
            .eq('user_name', user);

        if (error) throw error;

        const totalStretches = stretches ? stretches.length : 0;

        let completedToday = 0;
        if (stretches && stretches.length > 0) {
            const stretchIds = stretches.map(s => s.id);
            const { data: completions, error: compError } = await db
                .from('stretch_completions')
                .select('id')
                .in('stretch_id', stretchIds)
                .eq('completed_date', today);

            if (!compError) {
                completedToday = completions ? completions.length : 0;
            }
        }

        document.getElementById('stretches-completed').textContent = completedToday;
        document.getElementById('stretches-total').textContent = totalStretches;
    } catch (err) {
        console.error('Error loading stretch stats:', err);
    }
}

async function loadBookStats() {
    const user = getCurrentUser();

    try {
        const { data: books, error } = await db
            .from('books')
            .select('status')
            .eq('user_name', user);

        if (error) throw error;

        const stats = { reading: 0, to_read: 0, finished: 0 };
        if (books) {
            books.forEach(book => {
                if (stats.hasOwnProperty(book.status)) {
                    stats[book.status]++;
                }
            });
        }

        document.getElementById('books-reading').textContent = stats.reading;
        document.getElementById('books-to-read').textContent = stats.to_read;
        document.getElementById('books-finished').textContent = stats.finished;
    } catch (err) {
        console.error('Error loading book stats:', err);
    }
}

async function loadQuickHabits() {
    const user = getCurrentUser();
    const today = getToday();
    const container = document.getElementById('habits-list');

    try {
        // Get habits
        const { data: habits, error } = await db
            .from('habits')
            .select('*')
            .eq('user_name', user)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!habits || habits.length === 0) {
            container.innerHTML = '<p class="empty-state">No habits yet! <a href="habits.html">Add your first habit</a></p>';
            return;
        }

        // Get today's completions
        const habitIds = habits.map(h => h.id);
        const { data: completions } = await db
            .from('habit_completions')
            .select('habit_id')
            .in('habit_id', habitIds)
            .eq('completed_date', today);

        const completedIds = new Set(completions ? completions.map(c => c.habit_id) : []);

        // Get streaks
        const streaks = await Promise.all(habits.map(h => getHabitStreak(h.id)));

        container.innerHTML = habits.map((habit, idx) => `
            <div class="habit-item ${completedIds.has(habit.id) ? 'completed' : ''}">
                <button class="habit-checkbox" data-id="${habit.id}">
                    ${completedIds.has(habit.id) ? '&#10003;' : ''}
                </button>
                <span class="habit-name">${escapeHtml(habit.name)}</span>
                ${streaks[idx] > 0 ? `<span class="streak">${streaks[idx]} day streak</span>` : ''}
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.habit-checkbox').forEach(btn => {
            btn.addEventListener('click', () => toggleHabit(btn.dataset.id));
        });
    } catch (err) {
        console.error('Error loading quick habits:', err);
        container.innerHTML = '<p class="error">Error loading habits</p>';
    }
}

async function getHabitStreak(habitId) {
    try {
        const { data: completions, error } = await db
            .from('habit_completions')
            .select('completed_date')
            .eq('habit_id', habitId)
            .order('completed_date', { ascending: false });

        if (error || !completions || completions.length === 0) return 0;

        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        const completionDates = new Set(completions.map(c => c.completed_date));

        // Check if completed today
        const todayStr = checkDate.toISOString().split('T')[0];
        if (!completionDates.has(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (completionDates.has(checkDate.toISOString().split('T')[0])) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
    } catch (err) {
        console.error('Error calculating streak:', err);
        return 0;
    }
}

async function toggleHabit(habitId) {
    const today = getToday();

    try {
        // Check if already completed
        const { data: existing } = await db
            .from('habit_completions')
            .select('id')
            .eq('habit_id', habitId)
            .eq('completed_date', today)
            .single();

        if (existing) {
            // Remove completion
            await db
                .from('habit_completions')
                .delete()
                .eq('id', existing.id);
        } else {
            // Add completion
            await db
                .from('habit_completions')
                .insert({ habit_id: habitId, completed_date: today });
        }

        // Reload
        await loadDashboard();
    } catch (err) {
        console.error('Error toggling habit:', err);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initAuth(loadDashboard);
});
