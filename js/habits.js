// Habits Page Logic

async function loadHabits() {
    const user = getCurrentUser();
    const today = getToday();
    const container = document.getElementById('habits-container');

    try {
        // Get all habits for user
        const { data: habits, error } = await db
            .from('habits')
            .select('*')
            .eq('user_name', user)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!habits || habits.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No habits yet! Add your first habit above to start tracking.</p></div>';
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

        // Get streaks for all habits
        const streaks = await Promise.all(habits.map(h => getHabitStreak(h.id)));

        container.innerHTML = habits.map((habit, idx) => `
            <div class="habit-item ${completedIds.has(habit.id) ? 'completed' : ''}">
                <button class="habit-checkbox" data-id="${habit.id}" title="Toggle completion">
                    ${completedIds.has(habit.id) ? '&#10003;' : ''}
                </button>
                <div class="habit-info">
                    <span class="habit-name">${escapeHtml(habit.name)}</span>
                    <span class="habit-meta">
                        ${streaks[idx] > 0
                            ? `<span class="streak">${streaks[idx]} day${streaks[idx] !== 1 ? 's' : ''} streak</span>`
                            : '<span class="no-streak">No current streak</span>'
                        }
                    </span>
                </div>
                <button class="btn btn-danger btn-small delete-habit" data-id="${habit.id}">Delete</button>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.habit-checkbox').forEach(btn => {
            btn.addEventListener('click', () => toggleHabit(btn.dataset.id));
        });

        container.querySelectorAll('.delete-habit').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this habit?')) {
                    deleteHabit(btn.dataset.id);
                }
            });
        });
    } catch (err) {
        console.error('Error loading habits:', err);
        container.innerHTML = '<p class="error">Error loading habits. Check console for details.</p>';
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
            await db
                .from('habit_completions')
                .delete()
                .eq('id', existing.id);
        } else {
            await db
                .from('habit_completions')
                .insert({ habit_id: habitId, completed_date: today });
        }

        await loadHabits();
    } catch (err) {
        console.error('Error toggling habit:', err);
    }
}

async function addHabit(name) {
    const user = getCurrentUser();

    try {
        const { error } = await db
            .from('habits')
            .insert({
                user_name: user,
                name: name,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        await loadHabits();
    } catch (err) {
        console.error('Error adding habit:', err);
        alert('Error adding habit. Check console for details.');
    }
}

async function deleteHabit(habitId) {
    try {
        // Delete completions first
        await db
            .from('habit_completions')
            .delete()
            .eq('habit_id', habitId);

        // Delete habit
        await db
            .from('habits')
            .delete()
            .eq('id', habitId);

        await loadHabits();
    } catch (err) {
        console.error('Error deleting habit:', err);
        alert('Error deleting habit. Check console for details.');
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
    initAuth(loadHabits);

    // Add habit form
    const form = document.getElementById('add-habit-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('habit-name');
            const name = input.value.trim();
            if (name) {
                await addHabit(name);
                input.value = '';
            }
        });
    }
});
