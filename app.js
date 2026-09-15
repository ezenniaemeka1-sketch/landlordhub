const KEY="landlordhub_v2";
const seed={
  properties:[
    {id:"p1",name:"House A",location:"Amasaman",units:3},
    {id:"p2",name:"Roadside House",location:"Amasaman",units:2}
  ],
  tenants:[
    {id:"t1",name:"Kwame Mensah",propertyId:"p1",unit:"Room 1",rent:1200,due:1,status:"Paid"},
    {id:"t2",name:"Adwoa Boateng",propertyId:"p1",unit:"Room 2",rent:1200,due:5,status:"Overdue"},
    {id:"t3",name:"Kofi Asare",propertyId:"p1",unit:"Room 3",rent:1500,due:10,status:"Paid"}
  ],
  payments:[
    {id:"pay1",tenantId:"t1",amount:1200,date:"Today",method:"MoMo"},
    {id:"pay2",tenantId:"t3",amount:1500,date:"Today",method:"Cash"}
  ]
};
let db=load();
let currentView="home";

function load(){
  try{
    const saved=localStorage.getItem(KEY);
    return saved?JSON.parse(saved):structuredClone(seed);
  }catch(e){return structuredClone(seed)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function money(n){return "GH₵ "+Number(n||0).toLocaleString("en-GH")}
function prop(id){return db.properties.find(p=>p.id===id)}
function tenant(id){return db.tenants.find(t=>t.id===id)}
function totals(){
  const roll=db.tenants.reduce((s,t)=>s+Number(t.rent||0),0);
  const collected=db.payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const overdue=db.tenants.filter(t=>t.status==="Overdue").reduce((s,t)=>s+Number(t.rent||0),0);
  return {roll,collected,overdue,pct:roll?Math.round(collected/roll*100):0};
}
function render(){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
  const app=document.getElementById("app");
  if(currentView==="home") app.innerHTML=home();
  if(currentView==="properties") app.innerHTML=properties();
  if(currentView==="tenants") app.innerHTML=tenants();
  if(currentView==="payments") app.innerHTML=payments();
}
function home(){
  const t=totals();
  return `<div class="greeting">Good evening</div>
  <h1 class="page-title">Dashboard</h1>
  <div class="grid">
    <div class="card"><div class="metric-label">RENT ROLL</div><div class="metric">${money(t.roll)}</div></div>
    <div class="card"><div class="metric-label">COLLECTED</div><div class="metric green">${money(t.collected)}</div></div>
    <div class="card"><div class="metric-label">ARREARS</div><div class="metric red">${money(t.overdue)}</div></div>
    <div class="card"><div class="metric-label">TENANTS</div><div class="metric">${db.tenants.length}</div></div>
  </div>
  <div class="section">
    <div class="section-head"><h2 class="section-title">Rent status</h2><span class="badge">${t.pct}%</span></div>
    <div class="card status-card">${db.tenants.length?db.tenants.map(t=>tenantRow(t)).join(""):`<div class="empty">No tenants yet.</div>`}</div>
  </div>
  <div class="section">
    <div class="section-head"><h2 class="section-title">Properties</h2><button class="link-btn" onclick="go('properties')">View all</button></div>
    <div class="card">${db.properties.slice(0,3).map(propertyMini).join("")}</div>
  </div>`;
}
function tenantRow(t){
  return `<div class="tenant-row"><div><div class="name">${esc(t.name)}</div><div class="sub">${esc(prop(t.propertyId)?.name||"No property")} — ${esc(t.unit)} · ${money(t.rent)}</div></div><span class="badge ${t.status==="Overdue"?"overdue":""}">${esc(t.status)}</span></div>`;
}
function propertyMini(p){
  const ts=db.tenants.filter(t=>t.propertyId===p.id);
  const roll=ts.reduce((s,t)=>s+t.rent,0);
  return `<div class="property-row"><div><div class="name">${esc(p.name)}</div><div class="sub">${esc(p.location)} · ${ts.length} tenant${ts.length===1?"":"s"}</div></div><strong>${money(roll)}</strong></div>`;
}
function properties(){
  return `<div class="greeting">Portfolio</div><h1 class="page-title">Properties</h1>
  <div class="toolbar"><input class="search" id="propertySearch" placeholder="Search properties..." oninput="filterProperties()"><button class="primary" onclick="openPropertyForm()">+ Add</button></div>
  <div id="propertyList">${db.properties.map(propertyCard).join("")}</div>`;
}
function propertyCard(p){
  const ts=db.tenants.filter(t=>t.propertyId===p.id), occupied=ts.length, roll=ts.reduce((s,t)=>s+t.rent,0);
  return `<div class="card property-card"><div class="property-top"><div><div class="property-name">${esc(p.name)}</div><div class="sub">${esc(p.location)}</div></div><button class="secondary" onclick="openPropertyForm('${p.id}')">Edit</button></div>
  <div class="stats"><div class="stat"><b>${p.units}</b><span>Total units</span></div><div class="stat"><b>${occupied}</b><span>Occupied</span></div><div class="stat"><b>${p.units-occupied}</b><span>Vacant</span></div></div>
  <div class="sub" style="margin-top:16px">Monthly rent roll <strong>${money(roll)}</strong></div></div>`;
}
function filterProperties(){
  const q=(document.getElementById("propertySearch").value||"").toLowerCase();
  document.getElementById("propertyList").innerHTML=db.properties.filter(p=>(p.name+" "+p.location).toLowerCase().includes(q)).map(propertyCard).join("");
}
function tenants(){
  return `<div class="greeting">People</div><h1 class="page-title">Tenants</h1>
  <div class="toolbar"><input class="search" id="tenantSearch" placeholder="Search tenants..." oninput="filterTenants()"><button class="primary" onclick="openTenantForm()">+ Add</button></div>
  <div id="tenantList" class="card">${db.tenants.map(tenantRow).join("")||`<div class="empty">No tenants yet.</div>`}</div>`;
}
function filterTenants(){
  const q=(document.getElementById("tenantSearch").value||"").toLowerCase();
  document.getElementById("tenantList").innerHTML=db.tenants.filter(t=>(t.name+" "+t.unit+" "+(prop(t.propertyId)?.name||"")).toLowerCase().includes(q)).map(tenantRow).join("")||`<div class="empty">No matching tenants.</div>`;
}
function payments(){
  return `<div class="greeting">Money in</div><h1 class="page-title">Payments</h1>
  <div class="card"><div class="metric-label">TOTAL RECORDED</div><div class="metric green">${money(db.payments.reduce((s,p)=>s+p.amount,0))}</div></div>
  <div class="section"><div class="section-head"><h2 class="section-title">Recent payments</h2><button class="primary" onclick="openPaymentForm()">+ Record</button></div>
  <div class="card">${db.payments.length?db.payments.slice().reverse().map(p=>`<div class="payment-row"><div><div class="name">${esc(tenant(p.tenantId)?.name||"Unknown tenant")}</div><div class="sub">${esc(p.date)} · ${esc(p.method)}</div></div><strong>${money(p.amount)}</strong></div>`).join(""):`<div class="empty">No payments recorded.</div>`}</div></div>`;
}
function openTenantForm(id){
  const existing=id?tenant(id):null;
  const options=db.properties.map(p=>`<option value="${p.id}" ${existing?.propertyId===p.id?"selected":""}>${esc(p.name)}</option>`).join("");
  showModal(`<div class="sheet"><div class="sheet-head"><h2>${existing?"Edit":"Add"} tenant</h2><button class="close" onclick="closeModal()">×</button></div>
  <div class="notice">A tenant belongs to a property and unit. Rent and due date will feed the dashboard automatically.</div>
  <form class="form" onsubmit="saveTenant(event,'${id||""}')">
  <label>Full name<input name="name" required value="${esc(existing?.name||"")}"></label>
  <label>Property<select name="propertyId" required>${options}</select></label>
  <label>Unit / room<input name="unit" required value="${esc(existing?.unit||"")}"></label>
  <label>Monthly rent (GH₵)<input name="rent" type="number" min="0" required value="${existing?.rent||""}"></label>
  <label>Rent due day<input name="due" type="number" min="1" max="31" required value="${existing?.due||1}"></label>
  <label>Status<select name="status"><option ${existing?.status==="Pending"?"selected":""}>Pending</option><option ${existing?.status==="Paid"?"selected":""}>Paid</option><option ${existing?.status==="Overdue"?"selected":""}>Overdue</option></select></label>
  <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save tenant</button></div>
  </form></div>`);
}
function saveTenant(e,id){
  e.preventDefault();const f=new FormData(e.target);
  const data={name:String(f.get("name")).trim(),propertyId:f.get("propertyId"),unit:String(f.get("unit")).trim(),rent:Number(f.get("rent")),due:Number(f.get("due")),status:f.get("status")};
  if(id) Object.assign(tenant(id),data); else db.tenants.push({id:"t"+Date.now(),...data});
  save();closeModal();render();
}
function openPropertyForm(id){
  const existing=id?prop(id):null;
  showModal(`<div class="sheet"><div class="sheet-head"><h2>${existing?"Edit":"Add"} property</h2><button class="close" onclick="closeModal()">×</button></div>
  <form class="form" onsubmit="saveProperty(event,'${id||""}')">
  <label>Property name<input name="name" required value="${esc(existing?.name||"")}"></label>
  <label>Location<input name="location" required value="${esc(existing?.location||"")}"></label>
  <label>Total units<input name="units" type="number" min="1" required value="${existing?.units||1}"></label>
  <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save property</button></div>
  </form></div>`);
}
function saveProperty(e,id){
  e.preventDefault();const f=new FormData(e.target);const data={name:String(f.get("name")).trim(),location:String(f.get("location")).trim(),units:Number(f.get("units"))};
  if(id) Object.assign(prop(id),data); else db.properties.push({id:"p"+Date.now(),...data});
  save();closeModal();render();
}
function openPaymentForm(){
  if(!db.tenants.length){alert("Add a tenant first.");return}
  const options=db.tenants.map(t=>`<option value="${t.id}">${esc(t.name)} — ${esc(t.unit)}</option>`).join("");
  showModal(`<div class="sheet"><div class="sheet-head"><h2>Record payment</h2><button class="close" onclick="closeModal()">×</button></div>
  <form class="form" onsubmit="savePayment(event)">
  <label>Tenant<select name="tenantId">${options}</select></label>
  <label>Amount (GH₵)<input name="amount" type="number" min="0" required></label>
  <label>Method<select name="method"><option>MoMo</option><option>Bank</option><option>Cash</option></select></label>
  <label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
  <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Record payment</button></div>
  </form></div>`);
}
function savePayment(e){
  e.preventDefault();const f=new FormData(e.target);db.payments.push({id:"pay"+Date.now(),tenantId:f.get("tenantId"),amount:Number(f.get("amount")),method:f.get("method"),date:f.get("date")});save();closeModal();render();
}
function showModal(html){const m=document.getElementById("modal");m.innerHTML=html;m.classList.remove("hidden")}
function closeModal(){const m=document.getElementById("modal");m.classList.add("hidden");m.innerHTML=""}
function go(view){currentView=view;render()}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
document.getElementById("quickAdd").addEventListener("click",()=>openTenantForm());
render();
