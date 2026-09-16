/* LANDLORDHUB V11
   Directly fixes the V8 property renderer.
   V8's propertyCard() was reading the old unit.rent values while
   the dashboard correctly reads tenant.rent. V11 patches that
   renderer before executing V8, so both screens use the same source.
*/
(async function () {
  try {
    const response = await fetch('app8.js?v=11');
    let source = await response.text();

    const oldFunction = source.match(/function propertyCard\(p\)\{[\s\S]*?\nfunction filterProperties\(\)/);
    if (!oldFunction) {
      throw new Error('V8 propertyCard function was not found.');
    }

    const newFunction = `function propertyCard(p){
      const occupiedUnits=p.units.filter(u=>u.tenantId);
      const rentForUnit=u=>{
        let tt=u.tenantId?tenant(u.tenantId):null;
        if(!tt)tt=db.tenants.find(t=>t.unitId===u.id);
        return tt?Number(tt.rent||0):Number(u.rent||0);
      };
      const occ=occupiedUnits.length;
      const roll=occupiedUnits.reduce((s,u)=>s+rentForUnit(u),0);
      return \\\`<div class="card property-card"><div class="property-top"><div><div class="property-name">\\\${esc(p.name)}</div><div class="sub">\\\${esc(p.location)}</div></div><button class="secondary" onclick="openPropertyForm('\\\${p.id}')">Edit</button></div><div class="stats"><div class="stat"><b>\\\${p.units.length}</b><span>Total units</span></div><div class="stat"><b>\\\${occ}</b><span>Occupied</span></div><div class="stat"><b>\\\${p.units.length-occ}</b><span>Vacant</span></div></div><div class="sub" style="margin-top:16px">Monthly rent roll <strong>\\\${money(roll)}</strong></div><div class="unit-list">\\\${p.units.map(u=>{const tt=u.tenantId?tenant(u.tenantId):db.tenants.find(t=>t.unitId===u.id);const r=tt?Number(tt.rent||0):Number(u.rent||0);return \\\`<div class="unit-row"><div><b>\\\${esc(u.name)}</b><span>\\\${tt?esc(tt.name):'Vacant'}</span></div><strong>\\\${money(r)}</strong></div>\\\`}).join('')}</div></div>\\\`;
    }
    function filterProperties()`;

    source = source.replace(oldFunction[0], newFunction);

    const script = document.createElement('script');
    script.textContent = source;
    document.head.appendChild(script);
  } catch (error) {
    console.error('LandlordHub V11 failed:', error);
    const msg = document.createElement('div');
    msg.style.cssText='padding:20px;font-family:system-ui;color:#8b1e1e;background:#fff3f3;';
    msg.textContent='LandlordHub V11 could not load the V8 application. Check the browser console.';
    document.body.prepend(msg);
  }
})();
