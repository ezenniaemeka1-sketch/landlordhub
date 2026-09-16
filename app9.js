/* LANDLORDHUB V9 — RENT CORRECTION
   This version keeps the working V8 application and corrects the
   property/unit rent values using the tenant records already saved
   on the device.

   Rule:
   - Occupied unit: tenant.rent is the source of truth.
   - Vacant unit: keep the unit's existing rent.
*/
(function () {
  const APP8 = 'app8.js';
  const KEY = 'landlordhub_v8';
  const APPLIED = 'landlordhub_v9_sync';

  function synchronizeSavedDatabase() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.properties) || !Array.isArray(data.tenants)) {
        return false;
      }

      let changed = false;

      data.properties.forEach(function (p) {
        (p.units || []).forEach(function (u) {
          let t = null;

          // First use the unit's tenantId — this is how app8 links
          // an occupied unit to its tenant.
          if (u.tenantId) {
            t = data.tenants.find(function (tenant) {
              return tenant.id === u.tenantId;
            });
          }

          // Fallback to the tenant's unitId.
          if (!t) {
            t = data.tenants.find(function (tenant) {
              return tenant.unitId === u.id;
            });
          }

          if (t) {
            const actualRent = Number(t.rent || 0);

            if (Number(u.rent || 0) !== actualRent || u.tenantId !== t.id) {
              u.rent = actualRent;
              u.tenantId = t.id;
              changed = true;
            }
          }
        });
      });

      if (changed) {
        localStorage.setItem(KEY, JSON.stringify(data));
      }

      return changed;
    } catch (error) {
      console.error('LandlordHub V9 sync error:', error);
      return false;
    }
  }

  function start() {
    const script = document.createElement('script');
    script.src = APP8 + '?v=9';

    script.onload = function () {
      const changed = synchronizeSavedDatabase();

      /*
        app8 has already rendered once. If we changed the saved data,
        reload once so app8 loads the corrected values and its own
        propertyCard function displays them.
      */
      if (changed && localStorage.getItem(APPLIED) !== '1') {
        localStorage.setItem(APPLIED, '1');
        window.location.reload();
        return;
      }

      if (localStorage.getItem(APPLIED) === '1') {
        localStorage.removeItem(APPLIED);
      }

      installTenantSaveSync();
      console.log('LandlordHub V9 active — tenant rent is the source of truth.');
    };

    script.onerror = function () {
      console.error('LandlordHub V9: app8.js could not be loaded.');
    };

    document.head.appendChild(script);
  }

  function installTenantSaveSync() {
    if (typeof window.saveTenant !== 'function') return;
    if (window.saveTenant.__v9Wrapped) return;

    const originalSaveTenant = window.saveTenant;

    window.saveTenant = function () {
      const result = originalSaveTenant.apply(this, arguments);

      /*
        app8 saves immediately inside sync(). Wait until its save has
        completed, then synchronize the unit rent and reload once.
      */
      setTimeout(function () {
        const changed = synchronizeSavedDatabase();

        if (changed && localStorage.getItem(APPLIED) !== '1') {
          localStorage.setItem(APPLIED, '1');
          window.location.reload();
        }
      }, 50);

      return result;
    };

    window.saveTenant.__v9Wrapped = true;
  }

  start();
})();
