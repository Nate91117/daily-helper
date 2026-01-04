// Food Page Logic

let currentRecipeId = null;

// Tab switching
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show correct tab content
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        });
    });
}

// ============ FREEZER ============

async function loadFreezerItems() {
    const user = getCurrentUser();
    const container = document.getElementById('freezer-container');

    try {
        const { data: items, error } = await db
            .from('freezer_items')
            .select('*')
            .eq('user_name', user)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Freezer is empty! Add items above.</p></div>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="freezer-item">
                <div class="freezer-item-info">
                    <span class="freezer-item-name">${escapeHtml(item.name)}</span>
                    ${item.quantity ? `<span class="freezer-item-qty">${escapeHtml(item.quantity)}</span>` : ''}
                    <span class="freezer-item-date">Added ${formatDate(item.date_added)}</span>
                </div>
                <button class="btn btn-small btn-danger delete-freezer" data-id="${item.id}">Used</button>
            </div>
        `).join('');

        container.querySelectorAll('.delete-freezer').forEach(btn => {
            btn.addEventListener('click', () => deleteFreezerItem(btn.dataset.id));
        });

    } catch (err) {
        console.error('Error loading freezer items:', err);
        container.innerHTML = '<p class="error">Error loading freezer items.</p>';
    }
}

async function addFreezerItem(name, quantity) {
    const user = getCurrentUser();

    try {
        const { error } = await db
            .from('freezer_items')
            .insert({
                user_name: user,
                name: name,
                quantity: quantity || null,
                date_added: getToday()
            });

        if (error) throw error;
        await loadFreezerItems();
    } catch (err) {
        console.error('Error adding freezer item:', err);
        alert('Error adding item.');
    }
}

async function deleteFreezerItem(id) {
    try {
        await db.from('freezer_items').delete().eq('id', id);
        await loadFreezerItems();
    } catch (err) {
        console.error('Error deleting freezer item:', err);
    }
}

// ============ RECIPES ============

async function loadRecipes() {
    const user = getCurrentUser();
    const container = document.getElementById('recipes-container');

    try {
        const { data: recipes, error } = await db
            .from('recipes')
            .select('*')
            .eq('user_name', user)
            .order('name', { ascending: true });

        if (error) throw error;

        if (!recipes || recipes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No recipes yet! Add your favorites above.</p></div>';
            return;
        }

        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" data-id="${recipe.id}">
                <h4 class="recipe-card-title">${escapeHtml(recipe.name)}</h4>
                ${recipe.link ? `<a href="${escapeHtml(recipe.link)}" target="_blank" class="recipe-link" onclick="event.stopPropagation()">Open Link</a>` : ''}
                ${recipe.ingredients || recipe.instructions ? '<span class="recipe-has-details">Has details</span>' : ''}
            </div>
        `).join('');

        container.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', () => openRecipeModal(card.dataset.id));
        });

    } catch (err) {
        console.error('Error loading recipes:', err);
        container.innerHTML = '<p class="error">Error loading recipes.</p>';
    }
}

async function addRecipe(name, link, ingredients, instructions, notes) {
    const user = getCurrentUser();

    try {
        const { error } = await db
            .from('recipes')
            .insert({
                user_name: user,
                name: name,
                link: link || null,
                ingredients: ingredients || null,
                instructions: instructions || null,
                notes: notes || null
            });

        if (error) throw error;
        await loadRecipes();
    } catch (err) {
        console.error('Error adding recipe:', err);
        alert('Error adding recipe.');
    }
}

async function openRecipeModal(recipeId) {
    try {
        const { data: recipe, error } = await db
            .from('recipes')
            .select('*')
            .eq('id', recipeId)
            .single();

        if (error) throw error;

        currentRecipeId = recipeId;

        document.getElementById('modal-recipe-name').textContent = recipe.name;

        document.getElementById('modal-recipe-link').innerHTML = recipe.link
            ? `<p><strong>Link:</strong> <a href="${escapeHtml(recipe.link)}" target="_blank">${escapeHtml(recipe.link)}</a></p>`
            : '';

        document.getElementById('modal-recipe-ingredients').innerHTML = recipe.ingredients
            ? `<div class="recipe-section"><h4>Ingredients</h4><pre>${escapeHtml(recipe.ingredients)}</pre></div>`
            : '';

        document.getElementById('modal-recipe-instructions').innerHTML = recipe.instructions
            ? `<div class="recipe-section"><h4>Instructions</h4><pre>${escapeHtml(recipe.instructions)}</pre></div>`
            : '';

        document.getElementById('modal-recipe-notes').innerHTML = recipe.notes
            ? `<div class="recipe-section"><h4>Notes</h4><p>${escapeHtml(recipe.notes)}</p></div>`
            : '';

        document.getElementById('recipe-modal').classList.remove('hidden');

    } catch (err) {
        console.error('Error loading recipe:', err);
    }
}

function closeRecipeModal() {
    document.getElementById('recipe-modal').classList.add('hidden');
    currentRecipeId = null;
}

async function deleteRecipe(id) {
    if (!confirm('Delete this recipe?')) return;

    try {
        await db.from('recipes').delete().eq('id', id);
        closeRecipeModal();
        await loadRecipes();
    } catch (err) {
        console.error('Error deleting recipe:', err);
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
    setupTabs();

    initAuth(async () => {
        await loadFreezerItems();
        await loadRecipes();
    });

    // Freezer form
    document.getElementById('add-freezer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('freezer-item-name').value.trim();
        const qty = document.getElementById('freezer-item-qty').value.trim();

        if (name) {
            await addFreezerItem(name, qty);
            document.getElementById('freezer-item-name').value = '';
            document.getElementById('freezer-item-qty').value = '';
        }
    });

    // Recipe form
    document.getElementById('add-recipe-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('recipe-name').value.trim();
        const link = document.getElementById('recipe-link').value.trim();
        const ingredients = document.getElementById('recipe-ingredients').value.trim();
        const instructions = document.getElementById('recipe-instructions').value.trim();
        const notes = document.getElementById('recipe-notes').value.trim();

        if (name) {
            await addRecipe(name, link, ingredients, instructions, notes);
            document.getElementById('recipe-name').value = '';
            document.getElementById('recipe-link').value = '';
            document.getElementById('recipe-ingredients').value = '';
            document.getElementById('recipe-instructions').value = '';
            document.getElementById('recipe-notes').value = '';
        }
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeRecipeModal);
    document.getElementById('recipe-modal').addEventListener('click', (e) => {
        if (e.target.id === 'recipe-modal') closeRecipeModal();
    });

    // Modal delete
    document.getElementById('modal-delete-btn').addEventListener('click', () => {
        if (currentRecipeId) deleteRecipe(currentRecipeId);
    });
});
