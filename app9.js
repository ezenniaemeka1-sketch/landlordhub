/* LANDLORDHUB V9
   Fix: occupied unit/property rent now follows the tenant's actual rent.
   Vacant units keep their own advertised/default rent.
*/
(function () {
  const APP8 = 'app8.js';
  const KEY = 'landlordhub_v8';

  function loadApp8() {
    if (typeof window.db !== 'undefined' && typeof window.render === 'function') {
      patch();
      return;
    }

    const s = document.createElement('script');
    s.src = APP8;
    s.onload = patch;
    s.onerror = function () {
      console.error('LandlordHub V9: could not load app8.js');
    };
    document.head.appendChild(s);
  }

  function syncUnitRentsFromTenants(data) {
    if (!data || !Array.isArray(data.properties) || !Array.isArray(data.tenants)) return data;

    data.properties.forEach(function (p) {
      (p.units || []).forEach(function (u) {
        const t = data.tenants.find(function (tenant) {
          return tenant.unitId === u.id;
        });

        // Occupied unit = tenant's actual rent.
        // Vacant unit = keep its existing unit rent.
        if (t) {
          u.rent = Number(t.rent || 0);
          u.tenantId = t.id;
        }
      });
    });

    return data;
  }

  function patch() {
    try {
      // Make the current saved V8 data the source for V9.
      window.db = syncUnitRentsFromTenants(window.db);

      // Save the corrected data so the fix survives refreshes.
      localStorage.setItem(KEY, JSON.stringify(window.db));

      // Replace the property card renderer so it ALWAYS reads
      // the tenant's actual rent for occupied units.
      window.propertyCard = function (p) {
        const units = p.units || [];
        const occupied = units.filter(function (u) {
          return !!u.tenantId;
        }).length;

        const currentRent = function (u) {
          const t = u.tenantId && typeof window.tenant === 'function'
            ? window.tenant(u.tenantId)
            : null;

          return t ? Number(t.rent || 0) : Number(u.rent || 0);
        };

        const roll = units
          .filter(function (u) { return !!u.tenantId; })
          .reduce(function (sum, u) {
            return sum + currentRent(u);
          }, 0);

        return `
          <div class="card property-card">
            <div class="property-top">
              <div>
                <div class="property-name">${window.esc(p.name)}</div>
                <div class="sub">${window.esc(p.location)}</div>
              </div>
              <button class="secondary" onclick="openPropertyForm('${p.id}')">Edit</button>
            </div>

            <div class="stats">
              <div class="stat"><b>${units.length}</b><span>Total units</span></div>
              <div class="stat"><b>${occupied}</b><span>Occupied</span></div>
              <div class="stat"><b>${units.length - occupied}</b><span>Vacant</span></div>
            </div>

            <div class="sub" style="margin-top:16px">
              Monthly rent roll <strong>${window.money(roll)}</strong>
            </div>

            <div class="unit-list">
              ${units.map(function (u) {
                const t = u.tenantId ? window.tenant(u.tenantId) : null;
                const rent = t ? Number(t.rent || 0) : Number(u.rent || 0);

                return `
                  <div class="unit-row">
                    <div>
                      <b>${window.esc(u.name)}</b>
                      <span>${t ? window.esc(t.name) : 'Vacant'}</span>
                    </div>
                    <strong>${window.money(rent)}</strong>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      };

      // Keep unit rent synchronized whenever a tenant is saved.
      const originalSaveTenant = window.saveTenant;
      if (!originalSaveTenant.__v9Wrapped) {
        const wrappedSaveTenant = function (e, id) {
          const result = originalSaveTenant.apply(this, arguments);

          try {
            const savedTenant = id ? window.tenant(id) : window.db.tenants[window.db.tenants.length - 1];

            if (savedTenant) {
              const p = window.prop(savedTenant.propertyId);
              const u = p && (p.units || []).find(function (unit) {
                return unit.id === savedTenant.unitId;
              });

              if (u) {
                u.rent = Number(savedTenant.rent || 0);
                u.tenantId = savedTenant.id;
              }

              localStorage.setItem(KEY, JSON.stringify(window.db));
              window.render();
            }
          } catch (err) {
            console.error('LandlordHub V9 tenant sync error:', err);
          }

          return result;
        };

        wrappedSaveTenant.__v9Wrapped = true;
        window.saveTenant = wrappedSaveTenant;
      }

      // Re-render the current screen with corrected values.
      window.render();

      console.log('LandlordHub V9 loaded: tenant rent is now the source of truth for occupied units.');
    } catch (err) {
      console.error('LandlordHub V9 error:', err);
    }
  }

  loadApp8();
})();
