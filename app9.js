/* LANDLORDHUB V9
   Fix: occupied unit/property rent follows the tenant's actual rent.
   Vacant units keep their existing/default rent.
*/
(function () {
  const APP8 = 'app8.js';
  const KEY = 'landlordhub_v8';
  const V9_APPLIED = 'landlordhub_v9_applied';

  function syncSavedData() {
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
          const t = data.tenants.find(function (tenant) {
            return tenant.unitId === u.id;
          });

          if (t) {
            const rent = Number(t.rent || 0);

            if (Number(u.rent || 0) !== rent || u.tenantId !== t.id) {
              u.rent = rent;
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
    } catch (err) {
      console.error('LandlordHub V9 sync error:', err);
      return false;
    }
  }

  function loadApp8() {
    const s = document.createElement('script');
    s.src = APP8;

    s.onload = function () {
      const changed = syncSavedData();

      if (changed && localStorage.getItem(V9_APPLIED) !== '1') {
        localStorage.setItem(V9_APPLIED, '1');
        window.location.reload();
        return;
      }

      if (localStorage.getItem(V9_APPLIED) === '1') {
        localStorage.removeItem(V9_APPLIED);
      }

      installTenantSync();
      console.log('LandlordHub V9 loaded.');
    };

    s.onerror = function () {
      console.error('LandlordHub V9: could not load app8.js');
    };

    document.head.appendChild(s);
  }

  function installTenantSync() {
    if (typeof window.saveTenant !== 'function') return;
    if (window.saveTenant.__v9Wrapped) return;

    const originalSaveTenant = window.saveTenant;

    const wrappedSaveTenant = function () {
      const result = originalSaveTenant.apply(this, arguments);

      setTimeout(function () {
        const changed = syncSavedData();

        if (changed && localStorage.getItem(V9_APPLIED) !== '1') {
          localStorage.setItem(V9_APPLIED, '1');
          window.location.reload();
        }
      }, 0);

      return result;
    };

    wrappedSaveTenant.__v9Wrapped = true;
    window.saveTenant = wrappedSaveTenant;
  }

  loadApp8();
})();
