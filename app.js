const SUPABASE_URL = 'https://zmjjptofhvwxkazqfhxi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptampwdG9maHZ3eGthenFmaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDk4NTMsImV4cCI6MjA5OTAyNTg1M30.1Zek0nY55-I3VtcGfG5oMdnw9YqgHyf7Syydx8S3hQQ';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Check auth on page load ───────────────────────────────────────
async function checkAuth() {
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    window.location.href = 'auth.html';
  } else {
    // Show user email in header
    const email = data.session.user.email;
    const el = document.getElementById('user-email');
    if (el) el.textContent = email;
  }
}

// ── Save budget to Supabase ───────────────────────────────────────
async function saveToCloud() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { alert('Not logged in.'); return; }

  const last  = document.getElementById('client-last').value.trim();
  const first = document.getElementById('client-first').value.trim();
  const now   = new Date();
  const date  = now.getFullYear() + '-'
    + String(now.getMonth()+1).padStart(2,'0') + '-'
    + String(now.getDate()).padStart(2,'0');
  const budgetName = (last || first || 'Budget') + ' - Budget ' + date;

  const payload = {
    user_id:    user.id,
    name:       budgetName,
    data: {
      clientFirst: first,
      clientLast:  last,
      income:  gatherSection('income-tbody',  'name',     'type'),
      expense: gatherSection('expense-tbody', 'category', 'expense')
    },
    updated_at: new Date().toISOString()
  };

  // Check if a budget already exists for this user
  const { data: existing } = await sb
    .from('budgets')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  let error;
  if (existing && existing.length > 0) {
    // Update existing record
    ({ error } = await sb
      .from('budgets')
      .update(payload)
      .eq('id', existing[0].id));
  } else {
    // Insert new record
    ({ error } = await sb.from('budgets').insert(payload));
  }

  if (error) { alert('Save failed: ' + error.message); return; }

  // Visual feedback
  const btn = document.querySelector('button[onclick="saveToCloud()"]');
  if (btn) { btn.textContent = '✓ Saved!'; setTimeout(() => { btn.innerHTML = '&#9729; Save'; }, 2000); }
}

// ── Load budget from Supabase ─────────────────────────────────────
async function loadFromCloud() {
  const { data, error } = await sb
    .from('budgets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !data || !data.length) {
    alert('No saved budget found.');
    return;
  }

  const d = data[0].data;
  document.getElementById('income-tbody').innerHTML  = '';
  document.getElementById('expense-tbody').innerHTML = '';
  document.getElementById('client-first').value = d.clientFirst || '';
  document.getElementById('client-last').value  = d.clientLast  || '';
  if (typeof updateDocTitle === 'function') updateDocTitle();
  (d.income  || []).forEach(r => {
    const s = { name: r.name||'', type: r.type||'' };
    if (r.src && r[r.src] !== '') s[r.src] = r[r.src];
    addIncomeRow(s);
  });
  (d.expense || []).forEach(r => {
    const s = { category: r.category||'', expense: r.expense||'' };
    if (r.src && r[r.src] !== '') s[r.src] = r[r.src];
    addExpenseRow(s);
  });
  if (typeof updateAll === 'function') updateAll();
}

// ── Sign out ──────────────────────────────────────────────────────
async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'auth.html';
}

// ── Run on page load ──────────────────────────────────────────────
checkAuth();
