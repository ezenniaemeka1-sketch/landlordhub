/* LANDLORDHUB V10 — RENT CORRECTION
   Synchronize saved tenant rents BEFORE V8 is loaded.
   This makes the existing V8 property screen display the actual
   tenant rent values without changing V8 itself.
*/
(function () {
  const APP8 = 'app8.js?v=10';
  const KEY = 'landlordhub_v8';

  function synchronizeSavedDatabase() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.properties) || !Array.isArray(data.tenants)) return;

      data.properties.forEach(function (p) {
        (p.units || []).forEach(function (u) {
          let t = null;

          // Primary relationship: unit -> tenant.
          if (u.tenantId) {
            t = data.tenants.find(function (tenant) {
              return tenant.id === u.tenantId;
            });
          }

          // Fallback relationship: tenant -> unit.
          if (!t) {
            t = data.tenants.find(function (tenant) {
              return tenant.unitId === u.id;
            });
          }

          // Occupied unit: tenant rent is the source of truth.
          if (t) {
            u.rent = Number(t.rent || 0);
            u.tenantId = t.id;
          }
        });
      });

      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (error) {
      console.error('LandlordHub V10 sync error:', error);
    }
  }

  // IMPORTANT: fix the saved database BEFORE app8 loads and renders.
  synchronizeSavedDatabase();

  const script = document.createElement('script');
  script.src = APP8;
  script.onload = function () {
    console.log('LandlordHub V10 active — property rents synchronized before V8 render.');
  };
  script.onerror = function () {
    console.error('LandlordHub V10: app8.js could not be loaded.');
  };
  document.head.appendChild(script);
})();
