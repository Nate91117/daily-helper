// Reading List Page Logic

let currentFilters = { status: '', genre: '' };

async function loadBooks() {
    const user = getCurrentUser();
    const container = document.getElementById('books-container');

    try {
        let query = db
            .from('books')
            .select('*')
            .eq('user_name', user)
            .order('created_at', { ascending: false });

        if (currentFilters.status) {
            query = query.eq('status', currentFilters.status);
        }
        if (currentFilters.genre) {
            query = query.eq('genre', currentFilters.genre);
        }

        const { data: books, error } = await query;

        if (error) throw error;

        if (!books || books.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    ${currentFilters.status || currentFilters.genre
                        ? '<p>No books match your filters.</p>'
                        : '<p>No books yet! Add your first book above.</p>'
                    }
                </div>
            `;
            return;
        }

        container.innerHTML = books.map(book => `
            <div class="book-card status-${book.status}">
                <div class="book-header">
                    <h4 class="book-title">${escapeHtml(book.title)}</h4>
                    ${book.author ? `<p class="book-author">by ${escapeHtml(book.author)}</p>` : ''}
                </div>
                <div class="book-meta">
                    ${book.genre ? `<span class="genre-tag">${escapeHtml(book.genre)}</span>` : ''}
                    <span class="status-tag status-${book.status}">
                        ${book.status === 'to_read' ? 'To Read' : book.status === 'reading' ? 'Reading' : 'Finished'}
                    </span>
                </div>
                <div class="book-edit-form">
                    <div class="form-row">
                        <label>Status:</label>
                        <select class="status-select" data-id="${book.id}">
                            <option value="to_read" ${book.status === 'to_read' ? 'selected' : ''}>To Read</option>
                            <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>Reading</option>
                            <option value="finished" ${book.status === 'finished' ? 'selected' : ''}>Finished</option>
                        </select>
                    </div>
                    <div class="form-row dates">
                        <div>
                            <label>Started:</label>
                            <input type="date" class="date-started" data-id="${book.id}" value="${book.date_started || ''}">
                        </div>
                        <div>
                            <label>Finished:</label>
                            <input type="date" class="date-finished" data-id="${book.id}" value="${book.date_finished || ''}">
                        </div>
                    </div>
                </div>
                <div class="book-actions">
                    <button class="btn btn-danger btn-small delete-book" data-id="${book.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', () => updateBook(select.dataset.id, { status: select.value }));
        });

        container.querySelectorAll('.date-started').forEach(input => {
            input.addEventListener('change', () => updateBook(input.dataset.id, { date_started: input.value || null }));
        });

        container.querySelectorAll('.date-finished').forEach(input => {
            input.addEventListener('change', () => updateBook(input.dataset.id, { date_finished: input.value || null }));
        });

        container.querySelectorAll('.delete-book').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this book?')) {
                    deleteBook(btn.dataset.id);
                }
            });
        });
    } catch (err) {
        console.error('Error loading books:', err);
        container.innerHTML = '<p class="error">Error loading books. Check console for details.</p>';
    }
}

async function loadGenres() {
    const user = getCurrentUser();

    try {
        const { data: books, error } = await db
            .from('books')
            .select('genre')
            .eq('user_name', user)
            .not('genre', 'is', null);

        if (error) throw error;

        const genres = [...new Set(books.map(b => b.genre).filter(g => g))];

        // Update filter dropdown
        const filterSelect = document.getElementById('filter-genre');
        filterSelect.innerHTML = '<option value="">All Genres</option>' +
            genres.map(g => `<option value="${escapeHtml(g)}" ${currentFilters.genre === g ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('');

        // Update datalist for add form
        const datalist = document.getElementById('genre-list');
        datalist.innerHTML = genres.map(g => `<option value="${escapeHtml(g)}">`).join('');
    } catch (err) {
        console.error('Error loading genres:', err);
    }
}

async function addBook(title, author, genre, status) {
    const user = getCurrentUser();

    try {
        const { error } = await db
            .from('books')
            .insert({
                user_name: user,
                title: title,
                author: author || null,
                genre: genre || null,
                status: status,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        await loadBooks();
        await loadGenres();
    } catch (err) {
        console.error('Error adding book:', err);
        alert('Error adding book. Check console for details.');
    }
}

async function updateBook(bookId, updates) {
    try {
        const { error } = await db
            .from('books')
            .update(updates)
            .eq('id', bookId);

        if (error) throw error;

        await loadBooks();
    } catch (err) {
        console.error('Error updating book:', err);
        alert('Error updating book. Check console for details.');
    }
}

async function deleteBook(bookId) {
    try {
        const { error } = await db
            .from('books')
            .delete()
            .eq('id', bookId);

        if (error) throw error;

        await loadBooks();
        await loadGenres();
    } catch (err) {
        console.error('Error deleting book:', err);
        alert('Error deleting book. Check console for details.');
    }
}

function applyFilters() {
    currentFilters.status = document.getElementById('filter-status').value;
    currentFilters.genre = document.getElementById('filter-genre').value;

    // Show/hide clear button
    const clearBtn = document.getElementById('clear-filters');
    if (currentFilters.status || currentFilters.genre) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    loadBooks();
}

function clearFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-genre').value = '';
    currentFilters = { status: '', genre: '' };
    document.getElementById('clear-filters').classList.add('hidden');
    loadBooks();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check URL params for initial filter
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam) {
        currentFilters.status = statusParam;
        document.getElementById('filter-status').value = statusParam;
        document.getElementById('clear-filters').classList.remove('hidden');
    }

    initAuth(async () => {
        await loadGenres();
        await loadBooks();
    });

    // Add book form
    const form = document.getElementById('add-book-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('book-title').value.trim();
            const author = document.getElementById('book-author').value.trim();
            const genre = document.getElementById('book-genre').value.trim();
            const status = document.getElementById('book-status').value;

            if (title) {
                await addBook(title, author, genre, status);
                document.getElementById('book-title').value = '';
                document.getElementById('book-author').value = '';
                document.getElementById('book-genre').value = '';
                document.getElementById('book-status').value = 'to_read';
            }
        });
    }

    // Filter listeners
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    document.getElementById('filter-genre').addEventListener('change', applyFilters);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
});
