// ---------- Utilities ----------
const LS_KEY = 'smart_expense_data_v1';
const categoryColors = {
  Food: '#ef4444',
  Travel: '#f59e0b',
  Bills: '#06b6d4',
  Shopping: '#a78bfa',
  Entertainment: '#10b981',
  Other: '#94a3b8'
};

function uid(){ 
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8) 
}

function loadExpenses(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ 
    console.error('load error', e); 
    return [] 
  }
}
function saveExpenses(arr){ 
  localStorage.setItem(LS_KEY, JSON.stringify(arr)) 
}

// ---------- App state ----------
let expenses = loadExpenses();

// ---------- DOM ----------
const form = document.getElementById('expenseForm');
const titleIn = document.getElementById('title');
const amountIn = document.getElementById('amount');
const categoryIn = document.getElementById('category');
const noteIn = document.getElementById('note');
const dateIn = document.getElementById('date');
const expensesList = document.getElementById('expensesList');
const allRecords = document.getElementById('allRecords');
const todayTotal = document.getElementById('todayTotal');
const monthTotal = document.getElementById('monthTotal');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

// default date to today
dateIn.valueAsDate = new Date();

// ---------- Chart ----------
const ctx = document.getElementById('categoryChart').getContext('2d');
let chart = new Chart(ctx, {
  type: 'doughnut',
  data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
  options: {
    plugins: { legend: { position: 'bottom' } },
    maintainAspectRatio: false
  }
});

// ---------- Render ----------
function render(){
  renderList();
  renderAllRecords();
  updateTotals();
  renderChart();
  saveExpenses(expenses);
}

function renderList(){
  const out = expenses.slice().sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0,20);
  expensesList.innerHTML = out.map(e=> {
    const date = new Date(e.date).toLocaleDateString();
    const amt = Number(e.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
    return `
      <div class="expense-item">
        <div class="dot" style="background:${categoryColors[e.category] || '#888'}"></div>
        <div class="meta">
          <div class="title">${escapeHtml(e.title)} <span class="small">• ${escapeHtml(e.category)}</span></div>
          <div class="desc">${escapeHtml(e.note || '')} <span class="small">• ${date}</span></div>
        </div>
        <div style="text-align:right">
          <div class="amt">₹${amt}</div>
          <div style="margin-top:6px"><button class="secondary" onclick="deleteExpense('${e.id}')">Delete</button></div>
        </div>
      </div>
    `
  }).join('') || '<div class="small">No expenses yet — add one!</div>';
}

function renderAllRecords(){
  const out = expenses.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  allRecords.innerHTML = out.map(e=>{
    const d = new Date(e.date).toLocaleString();
    return `<div style="padding:8px;border-bottom:1px dashed rgba(255,255,255,0.02)"><strong>₹${Number(e.amount).toFixed(2)}</strong> — ${escapeHtml(e.title)} <div class="small">${escapeHtml(e.category)} • ${d} ${e.note? '• '+escapeHtml(e.note):''}</div></div>`
  }).join('') || '<div class="small">No records</div>';
}

function updateTotals(){
  const now = new Date();
  const todayKey = now.toISOString().slice(0,10);
  const monthKey = now.toISOString().slice(0,7);

  let t = 0, m = 0;
  for(const e of expenses){
    const d = e.date.slice(0,10);
    if(d === todayKey) t += Number(e.amount);
    if(e.date.slice(0,7) === monthKey) m += Number(e.amount);
  }
  todayTotal.textContent = `₹${t.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  monthTotal.textContent = `₹${m.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function renderChart(){
  const sums = {};
  for(const e of expenses){
    sums[e.category] = (sums[e.category] || 0) + Number(e.amount);
  }
  const labels = Object.keys(sums);
  const data = labels.map(l=>sums[l]);
  const bg = labels.map(l => categoryColors[l] || '#777');
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.data.datasets[0].backgroundColor = bg;
  chart.update();
}

// ---------- Actions ----------
form.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const title = titleIn.value.trim();
  const amount = parseFloat(amountIn.value);
  const category = categoryIn.value;
  const note = noteIn.value.trim();
  const date = dateIn.value || (new Date()).toISOString().slice(0,10);
  if(!title || isNaN(amount) || amount <= 0) return alert('Please enter valid title and amount');

  const item = { id: uid(), title, amount: Number(amount), category, note, date };
  expenses.push(item);

  titleIn.value = '';
  amountIn.value = '';
  noteIn.value = '';
  dateIn.valueAsDate = new Date();
  render();
});

window.deleteExpense = function(id){
  if(!confirm('Delete this expense?')) return;
  expenses = expenses.filter(e=>e.id !== id);
  render();
}

exportBtn.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(expenses, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'expenses.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

clearAllBtn.addEventListener('click', ()=>{
  if(!confirm('Clear all expenses from localStorage? This cannot be undone.')) return;
  expenses = [];
  saveExpenses(expenses);
  render();
});

function escapeHtml(s){
  return String(s||'').replace(/[&"'<>]/g, function(c){
    return {'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[c];
  });
}

// initial render
render();

// expose for debugging
window._smartExpenses = {
  get: ()=>expenses,
  save: ()=>saveExpenses(expenses),
  load: ()=>{ expenses = loadExpenses(); render(); }
}
