// Stretches Page Logic

async function loadStretches() {
    const user = getCurrentUser();
    const today = getToday();
    const container = document.getElementById('stretches-container');

    try {
        // Get all stretches for user, ordered by priority (lower number = higher in list)
        const { data: stretches, error } = await db
            .from('stretches')
            .select('*')
            .eq('user_name', user)
            .order('priority', { ascending: true });

        if (error) throw error;

        if (!stretches || stretches.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No stretches yet! Add your first stretch above.</p></div>';
            return;
        }

        // Get today's completions
        const stretchIds = stretches.map(s => s.id);
        const { data: completions } = await db
            .from('stretch_completions')
            .select('stretch_id')
            .in('stretch_id', stretchIds)
            .eq('completed_date', today);

        const completedIds = new Set(completions ? completions.map(c => c.stretch_id) : []);
        const completedCount = stretches.filter(s => completedIds.has(s.id)).length;

        let html = `<div class="stretch-progress">Completed: ${completedCount} / ${stretches.length}</div>`;

        html += stretches.map((stretch, idx) => `
            <div class="stretch-item ${completedIds.has(stretch.id) ? 'completed' : ''}">
                <span class="stretch-number">${idx + 1}</span>
                <button class="stretch-checkbox" data-id="${stretch.id}" title="Toggle completion">
                    ${completedIds.has(stretch.id) ? '&#10003;' : ''}
                </button>
                <div class="stretch-info">
                    <span class="stretch-name">${escapeHtml(stretch.name)}</span>
                    ${stretch.body_area ? `<span class="stretch-area">${escapeHtml(stretch.body_area)}</span>` : ''}
                </div>
                <div class="stretch-actions">
                    <button class="btn-icon move-up" data-id="${stretch.id}" data-priority="${stretch.priority}" ${idx === 0 ? 'disabled' : ''} title="Move up">&#9650;</button>
                    <button class="btn-icon move-down" data-id="${stretch.id}" data-priority="${stretch.priority}" ${idx === stretches.length - 1 ? 'disabled' : ''} title="Move down">&#9660;</button>
                    <button class="btn btn-danger btn-small delete-stretch" data-id="${stretch.id}">Delete</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;

        // Add event listeners
        container.querySelectorAll('.stretch-checkbox').forEach(btn => {
            btn.addEventListener('click', () => toggleStretch(btn.dataset.id));
        });

        container.querySelectorAll('.delete-stretch').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this stretch?')) {
                    deleteStretch(btn.dataset.id);
                }
            });
        });

        container.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', () => moveStretch(btn.dataset.id, 'up'));
        });

        container.querySelectorAll('.move-down').forEach(btn => {
            btn.addEventListener('click', () => moveStretch(btn.dataset.id, 'down'));
        });

    } catch (err) {
        console.error('Error loading stretches:', err);
        container.innerHTML = '<p class="error">Error loading stretches. Check console for details.</p>';
    }
}

async function toggleStretch(stretchId) {
    const today = getToday();

    try {
        const { data: existing } = await db
            .from('stretch_completions')
            .select('id')
            .eq('stretch_id', stretchId)
            .eq('completed_date', today)
            .single();

        if (existing) {
            await db
                .from('stretch_completions')
                .delete()
                .eq('id', existing.id);
        } else {
            await db
                .from('stretch_completions')
                .insert({ stretch_id: stretchId, completed_date: today });
        }

        await loadStretches();
    } catch (err) {
        console.error('Error toggling stretch:', err);
    }
}

async function addStretch(name, bodyArea) {
    const user = getCurrentUser();

    try {
        // Get the max priority to add at the end
        const { data: existing } = await db
            .from('stretches')
            .select('priority')
            .eq('user_name', user)
            .order('priority', { ascending: false })
            .limit(1);

        const newPriority = existing && existing.length > 0 ? existing[0].priority + 1 : 1;

        const { error } = await db
            .from('stretches')
            .insert({
                user_name: user,
                name: name,
                body_area: bodyArea || null,
                priority: newPriority,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        await loadStretches();
    } catch (err) {
        console.error('Error adding stretch:', err);
        alert('Error adding stretch. Check console for details.');
    }
}

async function moveStretch(stretchId, direction) {
    const user = getCurrentUser();

    try {
        // Get all stretches in order
        const { data: stretches } = await db
            .from('stretches')
            .select('id, priority')
            .eq('user_name', user)
            .order('priority', { ascending: true });

        const currentIndex = stretches.findIndex(s => s.id === stretchId);
        if (currentIndex === -1) return;

        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (swapIndex < 0 || swapIndex >= stretches.length) return;

        // Swap priorities
        const currentPriority = stretches[currentIndex].priority;
        const swapPriority = stretches[swapIndex].priority;

        await db
            .from('stretches')
            .update({ priority: swapPriority })
            .eq('id', stretches[currentIndex].id);

        await db
            .from('stretches')
            .update({ priority: currentPriority })
            .eq('id', stretches[swapIndex].id);

        await loadStretches();
    } catch (err) {
        console.error('Error moving stretch:', err);
    }
}

async function deleteStretch(stretchId) {
    try {
        await db
            .from('stretch_completions')
            .delete()
            .eq('stretch_id', stretchId);

        await db
            .from('stretches')
            .delete()
            .eq('id', stretchId);

        await loadStretches();
    } catch (err) {
        console.error('Error deleting stretch:', err);
        alert('Error deleting stretch. Check console for details.');
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
    initAuth(loadStretches);

    const form = document.getElementById('add-stretch-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('stretch-name').value.trim();
            const area = document.getElementById('stretch-area').value.trim();

            if (name) {
                await addStretch(name, area);
                document.getElementById('stretch-name').value = '';
                document.getElementById('stretch-area').value = '';
            }
        });
    }
});
