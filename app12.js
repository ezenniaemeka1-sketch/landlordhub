/* LANDLORDHUB V12
   Minimal source patch: load the proven V8 app, but change every
   property-card reference to unit.rent so occupied units read the
   linked tenant's rent. No regex over whole functions, no reload loop.
*/
(function () {
  fetch('app8.js?v=12')
    .then(function (r) {
      if (!r.ok) throw new Error('Could not load app8.js');
      return r.text();
    })
    .then(function (source) {
      const rentExpr = "(u.tenantId?tenant(u.tenantId):db.tenants.find(t=>t.unitId===u.id))?.rent ?? u.rent ?? 0";

      // Property monthly rent roll and individual unit display.
      source = source.replaceAll("Number(u.rent||0)", "Number(" + rentExpr + ")");

      // Keep unit.rent synchronized when a tenant is edited/created.
      source = source.replace(
        "if(u)u.tenantId=newId;",
        "if(u){u.tenantId=newId;u.rent=Number(data.rent||0);}"
      );

      const script = document.createElement('script');
      script.textContent = source;
      document.head.appendChild(script);
    })
    .catch(function (error) {
      console.error('LandlordHub V12:', error);
      document.body.innerHTML =
        '<div style="padding:24px;font:16px system-ui">LandlordHub could not load. Please refresh once.</div>';
    });
})();
