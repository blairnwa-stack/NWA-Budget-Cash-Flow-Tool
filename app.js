const SUPABASE_URL = 'https://zmjjptofhvwxkazqfhxi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptampwdG9maHZ3eGthenFmaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDk4NTMsImV4cCI6MjA5OTAyNTg1M30.1Zek0nY55-I3VtcGfG5oMdnw9YqgHyf7Syydx8S3hQQ';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Show a toast notification ─────────────────────────────────────
function showToast(msg, type) {
  var existing = document.getElementById('sb-toast');
  if (existing) existing.remove();
  var t = document.createElement('div');
  t.id = 'sb-toast';
  t.textContent = msg;
  t.style.cssText = [
    'position:fixed', 'bottom:28px', 'right:28px', 'z-index:9999',
    'padding:12px 20px', 'border-radius:8px', 'font-size:0.82rem',
    'font-family:Inter,system-ui,sans-serif', 'font-weight:600',
    'box-shadow:0 4px 16px rgba(0,0,0,0.15)',
    type === 'error'
      ? 'background:#fef2f2;color:#ef4444;border:1.5px solid #fecaca'
      : 'background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0'
  ].join(';');
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 3500);
}

// ── Check auth on page load ───────────────────────────────────────
async function checkAuth() {
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    window.location.href = 'auth.html';
    return;
  }
  const el = document.getElementById('user-email');
  if (el) el.textContent = data.session.user.email;
}

// ── Save budget to Supabase ───────────────────────────────────────
async function saveToCloud() {
  try {
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) { showToast('Not logged in — please refresh.', 'error'); return; }

    const last  = (document.getElementById('client-last').value  || '').trim();
    const first = (document.getElementById('client-first').value || '').trim();
    const now   = new Date();
    const date  = now.getFullYear() + '-'
      + String(now.getMonth()+1).padStart(2,'0') + '-'
      + String(now.getDate()).padStart(2,'0');
    const budgetName = (last || first || 'Budget') + ' - Budget ' + date;

    const budgetData = {
      clientFirst: first,
      clientLast:  last,
      income:  gatherSection('income-tbody',  'name',     'type'),
      expense: gatherSection('expense-tbody', 'category', 'expense')
    };

    // Check if record already exists for this user
    const { data: existing, error: fetchErr } = await sb
      .from('budgets')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (fetchErr) { showToast('Save failed: ' + fetchErr.message, 'error'); return; }

    let saveErr;
    if (existing && existing.length > 0) {
      const { error } = await sb.from('budgets').update({
        name:       budgetName,
        data:       budgetData,
        updated_at: new Date().toISOString()
      }).eq('id', existing[0].id);
      saveErr = error;
    } else {
      const { error } = await sb.from('budgets').insert({
        user_id:    user.id,
        name:       budgetName,
        data:       budgetData,
        updated_at: new Date().toISOString()
      });
      saveErr = error;
    }

    if (saveErr) { showToast('Save failed: ' + saveErr.message, 'error'); return; }
    showToast('✓ Budget saved successfully!', 'success');

  } catch(e) {
    showToast('Unexpected error: ' + e.message, 'error');
  }
}

// ── Load budget from Supabase ─────────────────────────────────────
async function loadFromCloud() {
  try {
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) { showToast('Not logged in — please refresh.', 'error'); return; }

    const { data, error } = await sb
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) { showToast('Load failed: ' + error.message, 'error'); return; }
    if (!data || !data.length) { showToast('No saved budget found for your account.', 'error'); return; }

    const d = data[0].data;
    document.getElementById('income-tbody').innerHTML  = '';
    document.getElementById('expense-tbody').innerHTML = '';
    document.getElementById('client-first').value = d.clientFirst || '';
    document.getElementById('client-last').value  = d.clientLast  || '';
    if (typeof updateDocTitle === 'function') updateDocTitle();
    (d.income  || []).forEach(function(r) {
      const s = { name: r.name||'', type: r.type||'' };
      if (r.src && r[r.src] !== '') s[r.src] = r[r.src];
      addIncomeRow(s);
    });
    (d.expense || []).forEach(function(r) {
      const s = { category: r.category||'', expense: r.expense||'' };
      if (r.src && r[r.src] !== '') s[r.src] = r[r.src];
      addExpenseRow(s);
    });
    if (typeof updateAll === 'function') updateAll();
    showToast('✓ Budget loaded — ' + data[0].name, 'success');

  } catch(e) {
    showToast('Unexpected error: ' + e.message, 'error');
  }
}

// ── Sign out ──────────────────────────────────────────────────────
async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'auth.html';
}

// ── Run on page load ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
});
