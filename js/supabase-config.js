// Supabase Configuration
const SUPABASE_URL = 'https://qfcfgpgrtiuzjxgsjbnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmY2ZncGdydGl1emp4Z3NqYm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzc1MjUsImV4cCI6MjA4Mjk1MzUyNX0.Rwcrr41Uhv1llzMCFItoLgrs-Bt6gS_jCbX7QuJBuaM';

// Initialize Supabase client (using 'db' to avoid conflict with library name)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to get today's date in YYYY-MM-DD format
function getToday() {
    return new Date().toISOString().split('T')[0];
}

// Helper to format dates for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
