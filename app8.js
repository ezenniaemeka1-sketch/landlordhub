const KEY='landlordhub_v8';
const V7KEY='landlordhub_v7';
const V6KEY='landlordhub_v6';
const V5KEY='landlordhub_v5';

const seed={
 properties:[
  {id:'p1',name:'House A',location:'Amasaman',units:[
   {id:'u1',name:'Room 1',rent:1200,tenantId:'t1'},
   {id:'u2',name:'Room 2',rent:1200,tenantId:'t2'},
   {id:'u3',name:'Room 3',rent:1500,tenantId:'t3'}]},
  {id:'p2',name:'Roadside House',location:'Amasaman',units:[
   {id:'u4',name:'Apartment 1',rent:900,tenantId:null},
   {id:'u5',name:'Apartment 2',rent:900,tenantId:null}]},
  {id:'p3',name:'Excel',location:'Opah Forest',units:
   Array.from({length:6},(_,i)=>({id:'u'+(10+i),name:'Unit '+(i+1),rent:900,tenantId:i===1?'t4':null}))}],
 tenants:[
  {id:'t1',name:'Kwame Mensah',propertyId:'p1',unitId:'u1',rent:1200,due:1,phone:'',rentStartDate:todayISO(),monthsPaid:1,rentExpiryDate:addMonths(todayISO(),1),status:'Paid'},
  {id:'t2',name:'Adwoa Boateng',propertyId:'p1',unitId:'u2',rent:1200,due:5,phone:'',rentStartDate:todayISO(),monthsPaid:0,rentExpiryDate:todayISO(),status:'Overdue'},
  {id:'t3',name:'Kofi Asare',propertyId:'p1',unitId:'u3',rent:1500,due:10,phone:'',rentStartDate:todayISO(),monthsPaid:1,rentExpiryDate:addMonths(todayISO(),1),status:'Paid'},
  {id:'t4',name:'Kwame Freedom',propertyId:'p3',unitId:'u11',rent:900,due:1,phone:'',rentStartDate:todayISO(),monthsPaid:0,rentExpiryDate:todayISO(),status:'Pending'}],
 payments:[
  {id:'pay1',tenantId:'t1',amount:1200,date:todayISO(),method:'MoMo',note:'Rent'},
  {id:'pay2',tenantId:'t3',amount:1500,date:todayISO(),method:'Cash',note:'Rent'}],
 expenses:[]
};

let db=load(),currentView='home',lastDay=todayISO();

function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addMonths(dateStr,months){
 const d=new Date(dateStr+'T00:00:00'); const original=d.getDate();
 d.setDate(1); d.setMonth(d.getMonth()+Number(months||0));
 const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
 d.setDate(Math.min(original,last));
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function cloneSeed(){return JSON.parse(JSON.stringify(seed))}
function load(){
 try{
  const v=localStorage.getItem(KEY);
  if(v){const data=JSON.parse(v);migrateTenantDates(data);return data}
  const v7=localStorage.getItem(V7KEY);
  if(v7){const data=JSON.parse(v7);migrateTenantDates(data);syncRentPeriodsFromPayments(data);localStorage.setItem(KEY,JSON.stringify(data));return data}
  const v6=localStorage.getItem(V6KEY);
  if(v6){const data=JSON.parse(v6);migrateTenantDates(data);syncRentPeriodsFromPayments(data);localStorage.setItem(KEY,JSON.stringify(data));return data}
  const old=localStorage.getItem(V5KEY);
  if(old){const data=JSON.parse(old);migrateTenantDates(data);syncRentPeriodsFromPayments(data);localStorage.setItem(KEY,JSON.stringify(data));return data}
  return cloneSeed()
 }catch{return cloneSeed()}
}
function migrateTenantDates(data){
 (data.tenants||[]).forEach(t=>{
  if(!t.rentStartDate)t.rentStartDate=todayISO();
  if(t.monthsPaid==null)t.monthsPaid=0;
  if(!t.rentExpiryDate)t.rentExpiryDate=addMonths(t.rentStartDate,t.monthsPaid);
 });
}
function syncRentPeriodsFromPayments(data){
 (data.tenants||[]).forEach(t=>{
  const rent=Number(t.rent||0);
  if(!rent)return;
  const rentPayments=(data.payments||[]).filter(p=>p.tenantId===t.id&&Number(p.amount||0)>0&&String(p.note||'').toLowerCase().includes('rent'));
  if(!rentPayments.length)return;
  const total=rentPayments.reduce((sum,p)=>sum+Number(p.amount||0),0);
  const inferred=Math.floor(total/rent);
  if(inferred>Number(t.monthsPaid||0)){
   t.monthsPaid=inferred;
   t.rentExpiryDate=addMonths(t.rentStartDate||todayISO(),inferred);
  }
 });
}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function sync(){syncRentPeriodsFromPayments(db);db.tenants.forEach(t=>t.status=status(t));save()}
function money(n){return 'GH₵ '+Number(n||0).toLocaleString('en-GH')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function prop(id){return db.properties.find(p=>p.id===id)}
function tenant(id){return db.tenants.find(t=>t.id===id)}
function unit(t){return prop(t?.propertyId)?.units?.find(u=>u.id===t.unitId)}
function paidThisMonth(id){const k=monthKey();return db.payments.filter(p=>p.tenantId===id&&String(p.date||'').startsWith(k)).reduce((s,p)=>s+Number(p.amount||0),0)}
function monthKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function dateUTC(v){const [y,m,d]=String(v||'').split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
function daysBetween(a,b){return Math.round((dateUTC(b)-dateUTC(a))/86400000)}
function liveRent(t){
 const start=t.rentStartDate, expiry=t.rentExpiryDate, today=todayISO();
 if(!start||!expiry)return {label:'Not set',cls:'pending',progress:0,period:'—'};
 if(today<start){const d=daysBetween(today,start);return {label:'Starts in '+d+' day'+(d===1?'':'s'),cls:'pending',progress:0,period:formatDate(start)+' → '+formatDate(expiry)};}
 if(today>=expiry){const d=daysBetween(expiry,today);return {label:d+' day'+(d===1?'':'s')+' overdue',cls:'overdue',progress:100,period:formatDate(start)+' → '+formatDate(expiry)};}
 const total=Math.max(1,daysBetween(start,expiry)), elapsed=daysBetween(start,today);
 let currentStart=start, periodsElapsed=0;
 while(addMonths(currentStart,1)<=today){currentStart=addMonths(currentStart,1);periodsElapsed++;}
 const remaining=daysBetween(today,expiry), totalMonths=Number(t.monthsPaid||0), currentMonth=Math.min(totalMonths,periodsElapsed+1);
 return {label:remaining+' day'+(remaining===1?'':'s')+' remaining',cls:'paid',progress:Math.min(100,Math.round(elapsed/total*100)),period:formatDate(currentStart)+' → '+formatDate(addMonths(currentStart,1)),currentMonth,totalMonths,monthsRemaining:Math.max(0,totalMonths-currentMonth)};
}
function liveRentPanel(t){
 const r=liveRent(t);
 return `<div class="live-rent"><div class="live-rent-head"><div><div class="profile-kicker">LIVE RENT READING</div><strong>Automatically updated</strong></div><span class="live-pill ${r.cls}">${esc(r.label)}</span></div><div class="live-rent-grid"><div><span>Today</span><b>${formatDate(todayISO())}</b></div><div><span>Current rent period</span><b>${r.period}</b></div><div><span>Months covered</span><b>${Number(t.monthsPaid||0)}</b></div><div><span>Current month</span><b>${r.currentMonth&&r.totalMonths?r.currentMonth+' of '+r.totalMonths:'—'}</b></div><div><span>Expiry date</span><b>${formatDate(t.rentExpiryDate)}</b></div></div><div class="rent-progress"><div class="rent-progress-top"><span>Rent period elapsed</span><b>${r.progress}%</b></div><div class="rent-track"><div class="rent-fill" style="width:${r.progress}%"></div></div></div><div class="live-rent-note">This reading updates automatically with the calendar. Open the tenant profile and the app will calculate the tenant's current rent position without manual recalculation.</div></div>`;
}
function status(t){
 const expiry=t.rentExpiryDate;
 if(!expiry)return 'Pending';
 const today=todayISO();
 if(today<expiry)return t.monthsPaid>0?'Paid':'Pending';
 return 'Overdue';
}
function dueSuffix(n){const x=Number(n);if(x%100>=11&&x%100<=13)return 'th';return x%10===1?'st':x%10===2?'nd':x%10===3?'rd':'th'}
function formatDate(v){if(!v)return '—';return new Intl.DateTimeFormat('en-GH',{day:'numeric',month:'short',year:'numeric'}).format(new Date(v+'T00:00:00'))}
function totals(){sync();const roll=db.tenants.reduce((s,t)=>s+Number(t.rent||0),0),col=db.tenants.reduce((s,t)=>s+Math.min(paidThisMonth(t.id),Number(t.rent||0)),0),arr=db.tenants.reduce((s,t)=>s+Math.max(Number(t.rent||0)-paidThisMonth(t.id),0),0);return{roll,col,arr,pct:roll?Math.round(col/roll*100):0}}
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':h<21?'Good evening':'Good night'}
function time(){return new Intl.DateTimeFormat('en-GH',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(new Date())}
function date(){return new Intl.DateTimeFormat('en-GH',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}
function render(){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));document.getElementById('app').innerHTML=currentView==='home'?home():currentView==='properties'?properties():currentView==='tenants'?tenants():payments()}
function home(){
 const t=totals(),occupied=db.properties.reduce((s,p)=>s+p.units.filter(u=>u.tenantId).length,0),units=db.properties.reduce((s,p)=>s+p.units.length,0),expenses=monthExpenses();
 return `<div class="live-header"><div><div id="greetingText" class="greeting">${greeting()}</div><div id="liveDate" class="live-date">${date()}</div></div><div class="clock-wrap"><div class="clock-label">LIVE TIME</div><div id="digitalClock" class="digital-clock">${time()}</div></div></div>
 <h1 class="page-title">Dashboard</h1>
 <div class="grid"><div class="card"><div class="metric-label">RENT ROLL</div><div class="metric">${money(t.roll)}</div></div><div class="card"><div class="metric-label">COLLECTED</div><div class="metric green">${money(t.col)}</div></div><div class="card"><div class="metric-label">ARREARS</div><div class="metric red">${money(t.arr)}</div></div><div class="card"><div class="metric-label">OCCUPANCY</div><div class="metric">${units?Math.round(occupied/units*100):0}%</div><div class="sub">${occupied} of ${units} units</div></div></div>
 <div class="quick-grid"><button class="quick-card" onclick="openTenantForm()"><b>+ Tenant</b><span>Add a tenant</span></button><button class="quick-card" onclick="openPropertyForm()"><b>+ Property</b><span>Add a building</span></button><button class="quick-card" onclick="openPaymentForm()"><b>+ Payment</b><span>Record rent</span></button><button class="quick-card" onclick="openExpenseForm()"><b>+ Expense</b><span>Track spending</span></button></div>
 <div class="section"><div class="section-head"><h2 class="section-title">This month</h2><span class="badge">${t.pct}% collected</span></div><div class="card finance-grid"><div><span>Collected</span><b>${money(t.col)}</b></div><div><span>Outstanding</span><b class="redtext">${money(t.arr)}</b></div><div><span>Expenses</span><b>${money(expenses)}</b></div><div><span>Net cash</span><b class="greentext">${money(t.col-expenses)}</b></div></div></div>
 <div class="section"><div class="section-head"><h2 class="section-title">Rent status</h2><button class="link-btn" onclick="go('tenants')">View all</button></div><div class="card status-card">${db.tenants.map(tenantRow).join('')}</div></div>`
}
function tenantRow(t){
 const s=status(t),cls=s==='Overdue'?'overdue':s==='Part-paid'?'partial':'';
 return `<button class="tenant-row tenant-click" onclick="openTenantProfile('${t.id}')"><div><div class="name">${esc(t.name)}</div><div class="sub">${esc(prop(t.propertyId)?.name||'No property')} — ${esc(unit(t)?.name||'No unit')} · ${money(t.rent)}</div><div class="helper">Rent: ${formatDate(t.rentStartDate)} → ${formatDate(t.rentExpiryDate)} · ${Number(t.monthsPaid||0)} month${Number(t.monthsPaid||0)===1?'':'s'} paid</div></div><span class="badge ${cls}">${esc(s)}</span></button>`
}
function properties(){return `<div class="greeting">Portfolio</div><h1 class="page-title">Properties</h1><div class="toolbar"><input class="search" id="propertySearch" placeholder="Search properties..." oninput="filterProperties()"><button class="primary" onclick="openPropertyForm()">+ Add</button></div><div id="propertyList">${db.properties.map(propertyCard).join('')}</div>`}
function propertyCard(p){const occ=p.units.filter(u=>u.tenantId).length,roll=p.units.filter(u=>u.tenantId).reduce((s,u)=>s+Number(u.rent||0),0);return `<div class="card property-card"><div class="property-top"><div><div class="property-name">${esc(p.name)}</div><div class="sub">${esc(p.location)}</div></div><button class="secondary" onclick="openPropertyForm('${p.id}')">Edit</button></div><div class="stats"><div class="stat"><b>${p.units.length}</b><span>Total units</span></div><div class="stat"><b>${occ}</b><span>Occupied</span></div><div class="stat"><b>${p.units.length-occ}</b><span>Vacant</span></div></div><div class="sub" style="margin-top:16px">Monthly rent roll <strong>${money(roll)}</strong></div><div class="unit-list">${p.units.map(u=>{const tt=u.tenantId?tenant(u.tenantId):null;return `<div class="unit-row"><div><b>${esc(u.name)}</b><span>${tt?esc(tt.name):'Vacant'}</span></div><strong>${money(u.rent)}</strong></div>`}).join('')}</div></div>`}
function filterProperties(){const q=(document.getElementById('propertySearch').value||'').toLowerCase();document.getElementById('propertyList').innerHTML=db.properties.filter(p=>(p.name+' '+p.location).toLowerCase().includes(q)).map(propertyCard).join('')}
function tenants(){return `<div class="greeting">People</div><h1 class="page-title">Tenants</h1><div class="toolbar"><input class="search" id="tenantSearch" placeholder="Search tenants..." oninput="filterTenants()"><button class="primary" onclick="openTenantForm()">+ Add</button></div><div class="mini-filters"><span>${db.tenants.length} tenants</span><span>${db.tenants.filter(t=>status(t)==='Overdue').length} overdue</span><span>${db.tenants.filter(t=>status(t)==='Pending').length} pending</span></div><div id="tenantList" class="card">${db.tenants.map(tenantRow).join('')}</div>`}
function filterTenants(){const q=(document.getElementById('tenantSearch').value||'').toLowerCase();document.getElementById('tenantList').innerHTML=db.tenants.filter(t=>(t.name+' '+(prop(t.propertyId)?.name||'')+' '+(unit(t)?.name||'')).toLowerCase().includes(q)).map(tenantRow).join('')||'<div class="empty">No matching tenants.</div>'}
function payments(){const total=db.payments.reduce((s,p)=>s+Number(p.amount||0),0);return `<div class="greeting">Money in</div><h1 class="page-title">Payments</h1><div class="card"><div class="metric-label">TOTAL RECORDED</div><div class="metric green">${money(total)}</div></div><div class="section"><div class="section-head"><h2 class="section-title">Recent payments</h2><button class="primary" onclick="openPaymentForm()">+ Record</button></div><div class="card">${db.payments.slice().reverse().map(p=>`<div class="payment-row"><div><div class="name">${esc(tenant(p.tenantId)?.name||'Unknown tenant')}</div><div class="sub">${esc(p.date)} · ${esc(p.method)}${p.note?' · '+esc(p.note):''}</div></div><strong>${money(p.amount)}</strong></div>`).join('')||'<div class="empty">No payments recorded.</div>'}</div></div><div class="section"><div class="section-head"><h2 class="section-title">Expenses</h2><button class="primary" onclick="openExpenseForm()">+ Add</button></div><div class="card">${db.expenses.slice().reverse().map(e=>`<div class="payment-row"><div><div class="name">${esc(e.category)}</div><div class="sub">${esc(e.date)} · ${esc(e.note||'')}</div></div><strong>${money(e.amount)}</strong></div>`).join('')||'<div class="empty">No expenses recorded.</div>'}</div></div>`}
function monthExpenses(){const k=monthKey();return db.expenses.filter(e=>String(e.date||'').startsWith(k)).reduce((s,e)=>s+Number(e.amount||0),0)}

function openTenantProfile(id){
 const t=tenant(id);if(!t)return;const history=db.payments.filter(p=>p.tenantId===id).slice().reverse();
 showModal(`<div class="sheet"><div class="sheet-head"><div><div class="profile-kicker">TENANT PROFILE</div><h2>${esc(t.name)}</h2></div><button class="close" onclick="closeModal()">×</button></div>
 <div class="profile-hero"><div class="profile-avatar">${esc(t.name.charAt(0).toUpperCase())}</div><div><div class="profile-name">${esc(t.name)}</div><div class="sub">${esc(prop(t.propertyId)?.name||'No property')} · ${esc(unit(t)?.name||'No unit')}</div></div></div>
  ${liveRentPanel(t)}\n <div class="profile-grid">
  <div class="profile-stat"><span>Monthly rent</span><b>${money(t.rent)}</b></div>
  <div class="profile-stat"><span>Rent starts</span><b>${formatDate(t.rentStartDate)}</b></div>
  <div class="profile-stat"><span>Months paid</span><b>${Number(t.monthsPaid||0)}</b></div>
  <div class="profile-stat"><span>Rent expires</span><b>${formatDate(t.rentExpiryDate)}</b></div>
  <div class="profile-stat"><span>Status</span><b>${esc(status(t))}</b></div>
  <div class="profile-stat"><span>This month paid</span><b>${money(paidThisMonth(t.id))}</b></div>
 </div>
 <div class="profile-actions"><button class="secondary" onclick="closeModal();openTenantForm('${t.id}')">Edit tenant</button><button class="primary" onclick="closeModal();openPaymentForm('${t.id}')">+ Record payment</button></div>
 <div class="section"><h3 class="section-title">Payment history</h3><div class="card profile-history">${history.map(p=>`<div class="payment-row"><div><div class="name">${money(p.amount)}</div><div class="sub">${esc(p.date)} · ${esc(p.method)}</div></div><span class="badge">Recorded</span></div>`).join('')||'<div class="empty">No payments recorded yet.</div>'}</div></div></div>`)
}

function openTenantForm(id){
 window.editingTenantId=id||null; const x=id?tenant(id):null;if(!db.properties.length){alert('Add a property first.');return}
 const options=db.properties.map(p=>`<option value="${p.id}" ${x?.propertyId===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
 const selectedProp=x?.propertyId||db.properties[0].id;
 const units=prop(selectedProp)?.units.map(u=>`<option value="${u.id}" ${x?.unitId===u.id?'selected':''} ${u.tenantId&&u.tenantId!==id?'disabled':''}>${esc(u.name)}${u.tenantId&&u.tenantId!==id?' — occupied':''}</option>`).join('');
 const start=x?.rentStartDate||todayISO(),months=Number(x?.monthsPaid||0),expiry=x?.rentExpiryDate||addMonths(start,months);
 showModal(`<div class="sheet"><div class="sheet-head"><h2>${x?'Edit':'Add'} tenant</h2><button class="close" onclick="closeModal()">×</button></div>
 <form class="form" onsubmit="saveTenant(event,'${id||''}')">
 <label>Full name<input name="name" required value="${esc(x?.name||'')}"></label>
 <label>Property<select name="propertyId" id="tenantProperty" required onchange="refreshUnitOptions()">${options}</select></label>
 <label>Unit<select name="unitId" id="tenantUnit" required>${units}</select></label>
 <label>Monthly rent (GH₵)<input name="rent" id="tenantRent" type="number" min="0" required value="${x?.rent||prop(selectedProp)?.units?.find(u=>u.id===x?.unitId)?.rent||''}"></label>
 <label>Rent start date<input name="rentStartDate" id="rentStartDate" type="date" required value="${start}" onchange="recalculateExpiry()"><div class="helper">The date this tenant's current rent period begins.</div></label>
 <label>Number of months paid<input name="monthsPaid" id="monthsPaid" type="number" min="0" step="1" required value="${months}" oninput="recalculateExpiry()"><div class="helper">Enter the number of months covered by the payment.</div></label>
 <div class="calculated"><span>Rent expiry date</span><strong id="rentExpiryDisplay">${formatDate(expiry)}</strong><input type="hidden" name="rentExpiryDate" id="rentExpiryDate" value="${expiry}"><div class="helper">Calculated automatically from the start date + months paid.</div></div>
 <label>Rent due day<input name="due" type="number" min="1" max="31" value="${x?.due||1}"><div class="helper">Optional reminder day for future monthly billing.</div></label>
 <label>Phone (optional)<input name="phone" inputmode="tel" value="${esc(x?.phone||'')}"></label>
 <div class="notice">V8 tracks the rent period and links rent payments to the live reading: <b>start date → months paid → expiry date</b>. This will allow future versions to calculate renewals and arrears more accurately.</div>
 <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save tenant</button></div>
 </form></div>`)
}
function refreshUnitOptions(){
 const pid=document.getElementById('tenantProperty').value,p=prop(pid),s=document.getElementById('tenantUnit'),editingId=window.editingTenantId;
 s.innerHTML=(p?.units||[]).map(u=>`<option value="${u.id}" ${u.tenantId&&u.tenantId!==editingId?'disabled':''}>${esc(u.name)}${u.tenantId&&u.tenantId!==editingId?' — occupied':''}</option>`).join('');
 const u=p?.units?.find(x=>!x.tenantId);if(u)document.getElementById('tenantRent').value=u.rent
}
function recalculateExpiry(){
 const start=document.getElementById('rentStartDate')?.value,months=Number(document.getElementById('monthsPaid')?.value||0);
 if(!start)return;
 const expiry=addMonths(start,months);
 const hidden=document.getElementById('rentExpiryDate'),display=document.getElementById('rentExpiryDisplay');
 if(hidden)hidden.value=expiry;if(display)display.textContent=formatDate(expiry);
}
function saveTenant(e,id){
 e.preventDefault();const f=new FormData(e.target),pid=f.get('propertyId'),uid=f.get('unitId'),old=id?tenant(id):null;
 if(old&&old.unitId!==uid){const op=prop(old.propertyId);const ou=op?.units.find(u=>u.id===old.unitId);if(ou)ou.tenantId=null}
 const start=String(f.get('rentStartDate')),months=Math.max(0,Number(f.get('monthsPaid')||0)),expiry=addMonths(start,months);
 const data={name:String(f.get('name')).trim(),propertyId:pid,unitId:uid,rent:Number(f.get('rent')),due:Number(f.get('due')||1),phone:String(f.get('phone')||'').trim(),rentStartDate:start,monthsPaid:months,rentExpiryDate:expiry,status:'Pending'};
 if(id)Object.assign(old,data);else db.tenants.push({id:'t'+Date.now(),...data});
 const newId=id||db.tenants.at(-1).id;const u=prop(pid)?.units.find(u=>u.id===uid);if(u)u.tenantId=newId;
 sync();window.editingTenantId=null;closeModal();render()
}
function openPropertyForm(id){const x=id?prop(id):null;showModal(`<div class="sheet"><div class="sheet-head"><h2>${x?'Edit':'Add'} property</h2><button class="close" onclick="closeModal()">×</button></div><form class="form" onsubmit="saveProperty(event,'${id||''}')"><label>Property name<input name="name" required value="${esc(x?.name||'')}"></label><label>Location<input name="location" required value="${esc(x?.location||'')}"></label><label>Total units<input name="units" type="number" min="1" required value="${x?.units?.length||1}"></label><div class="notice">Each unit can later have its own tenant, rent period and meter.</div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save property</button></div></form></div>`)}
function saveProperty(e,id){e.preventDefault();const f=new FormData(e.target),n=Math.max(1,Number(f.get('units'))),x=id?prop(id):null;if(x){const occupied=x.units.filter(u=>u.tenantId);if(n<occupied.length){alert('Cannot reduce below occupied units.');return}const arr=[...x.units];while(arr.length<n)arr.push({id:'u'+Date.now()+arr.length,name:'Unit '+(arr.length+1),rent:900,tenantId:null});x.units=arr.slice(0,n);x.name=String(f.get('name')).trim();x.location=String(f.get('location')).trim()}else db.properties.push({id:'p'+Date.now(),name:String(f.get('name')).trim(),location:String(f.get('location')).trim(),units:Array.from({length:n},(_,i)=>({id:'u'+Date.now()+i,name:'Unit '+(i+1),rent:900,tenantId:null}))});save();closeModal();render()}
function openPaymentForm(pre){if(!db.tenants.length){alert('Add a tenant first.');return}const opts=db.tenants.map(t=>`<option value="${t.id}" ${pre===t.id?'selected':''}>${esc(t.name)} — ${esc(unit(t)?.name||'')}</option>`).join('');showModal(`<div class="sheet"><div class="sheet-head"><h2>Record payment</h2><button class="close" onclick="closeModal()">×</button></div><form class="form" onsubmit="savePayment(event)"><label>Tenant<select name="tenantId">${opts}</select></label><label>Amount (GH₵)<input name="amount" type="number" min="0" required></label><label>Method<select name="method"><option>MoMo</option><option>Bank</option><option>Cash</option></select></label><label>Date<input name="date" type="date" value="${todayISO()}"></label><label>Note<input name="note" placeholder="e.g. September rent"></label><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Record payment</button></div></form></div>`)}
function savePayment(e){
 e.preventDefault();
 const f=new FormData(e.target),tenantId=String(f.get('tenantId')),amount=Math.max(0,Number(f.get('amount')||0)),date=String(f.get('date')||todayISO()),note=String(f.get('note')||'').trim();
 const t=tenant(tenantId);
 db.payments.push({id:'pay'+Date.now(),tenantId,amount,method:f.get('method'),date,note});
 if(t&&amount>0&&Number(t.rent||0)>0&&note.toLowerCase().includes('rent')){
  const fullMonths=Math.floor(amount/Number(t.rent));
  if(fullMonths>0){
   const base=t.rentExpiryDate&&t.rentExpiryDate>date?t.rentExpiryDate:date;
   if(!t.rentStartDate)t.rentStartDate=date;
   if(!t.monthsPaid)t.monthsPaid=0;
   t.monthsPaid+=fullMonths;
   t.rentExpiryDate=addMonths(base,fullMonths);
  }
 }
 sync();closeModal();render();
}
function openExpenseForm(){showModal(`<div class="sheet"><div class="sheet-head"><h2>Add expense</h2><button class="close" onclick="closeModal()">×</button></div><form class="form" onsubmit="saveExpense(event)"><label>Category<select name="category"><option>Repairs</option><option>Utilities</option><option>Security</option><option>Maintenance</option><option>Taxes</option><option>Other</option></select></label><label>Amount (GH₵)<input name="amount" type="number" min="0" required></label><label>Date<input name="date" type="date" value="${todayISO()}"></label><label>Note<input name="note" placeholder="What was paid for?"></label><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save expense</button></div></form></div>`)}
function saveExpense(e){e.preventDefault();const f=new FormData(e.target);db.expenses.push({id:'e'+Date.now(),category:f.get('category'),amount:Number(f.get('amount')),date:f.get('date'),note:String(f.get('note')||'').trim()});save();closeModal();render()}
function showModal(html){const m=document.getElementById('modal');m.innerHTML=html;m.classList.remove('hidden')}
function closeModal(){const m=document.getElementById('modal');m.classList.add('hidden');m.innerHTML='';window.editingTenantId=null}
function go(v){currentView=v;render();window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
document.getElementById('quickAdd').addEventListener('click',()=>openTenantForm());
setInterval(()=>{const c=document.getElementById('digitalClock'),g=document.getElementById('greetingText'),d=document.getElementById('liveDate');if(c)c.textContent=time();if(g)g.textContent=greeting();if(d)d.textContent=date();const day=todayISO();if(day!==lastDay){lastDay=day;sync();render()}},1000);
render();
