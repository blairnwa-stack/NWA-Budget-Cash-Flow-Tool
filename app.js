const SUPABASE_URL = 'https://zmjjptofhvwxkazqfhxi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptampwdG9maHZ3eGthenFmaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDk4NTMsImV4cCI6MjA5OTAyNTg1M30.1Zek0nY55-I3VtcGfG5oMdnw9YqgHyf7Syydx8S3hQQ';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Redirect to login if not authenticated
async function checkAuth() {
  const { data } = await sb.auth.getSession();
  if (!data.session) window.location.href = 'auth.html';
}

async function saveToCloud() {
  const { data: { user } } = await sb.auth.getUser();
  const budgetName = document.getElementById('client-last').value
    + ' - Budget ' + new Date().toLocaleDateString('en-AU');

  const payload = {
    user_id: user.id,
    name: budgetName,
    data: {
      clientFirst: document.getElementById('client-first').value,
      clientLast:  document.getElementById('client-last').value,
      income:  gatherSection('income-tbody',  'name',     'type'),
      expense: gatherSection('expense-tbody', 'category', 'expense')
    },
    updated_at: new Date()
  };

  // Upsert — saves a new record or updates existing one for this user
  const { error } = await sb.from('budgets').upsert(payload);
  if (error) { alert('Save failed: ' + error.message); return; }
  alert('Budget saved!');
}

async function loadFromCloud() {
  const { data, error } = await sb.from('budgets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !data.length) { alert('No saved budgets found.'); return; }

  // If multiple budgets, let user pick (simple prompt for now)
  let chosen = data[0];
  if (data.length > 1) {
    const names = data.map((b, i) => i + ': ' + b.name).join('\n');
    const idx = parseInt(prompt('Choose a budget:\n' + names) || '0');
    chosen = data[idx] || data[0];
  }

  const d = chosen.data;
  document.getElementById('income-tbody').innerHTML  = '';
  document.getElementById('expense-tbody').innerHTML = '';
  document.getElementById('client-first').value = d.clientFirst || '';
  document.getElementById('client-last').value  = d.clientLast  || '';
  updateDocTitle();
  (d.income  || []).forEach(r => { const s = {name:r.name||'',type:r.type||''}; if(r.src&&r[r.src]!=='')s[r.src]=r[r.src]; addIncomeRow(s); });
  (d.expense || []).forEach(r => { const s = {category:r.category||'',expense:r.expense||''}; if(r.src&&r[r.src]!=='')s[r.src]=r[r.src]; addExpenseRow(s); });
  updateAll();
}

async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'auth.html';
}

// Run on page load
checkAuth();