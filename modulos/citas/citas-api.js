/* citas-api.js · puente entre las páginas y la base. Mismo código para la demo y para producción.
   modo "demo": todo corre en el navegador (citas-mock.js, datos inventados, se guarda en localStorage).
   modo "supabase": llama a las funciones SQL de modulos/citas/supabase/migrations por la API REST de Supabase (sin librerías).
     La clienta llama con la clave anon y su token de sesión como parámetro; el personal inicia sesión con correo y clave
     (Authentication) y llama con su JWT.
   Configuración en config.js:  DEMO.citas = { modo: 'supabase', url: 'https://xxxx.supabase.co', anonKey: '…', schema: 'belen_alvarez' }
   Nunca va la clave service_role aquí (CLAUDE.md §4.11): solo la anon, que es pública por diseño. */
(() => {
  const D = window.DEMO || {}, C = D.citas || {};
  const modo = C.modo === 'supabase' ? 'supabase' : 'demo';
  const K = (D.claveDemo || 'citas') + '_';
  const ls = { get: k => { try { return localStorage.getItem(K + k); } catch (e) { return null; } }, set: (k, v) => { try { v === null ? localStorage.removeItem(K + k) : localStorage.setItem(K + k, v); } catch (e) {} } };
  const jwt = () => ls.get('staff_jwt');

  async function http(url, opts) {
    let r;
    try { r = await fetch(url, opts); } catch (e) { throw new Error('Sin conexión. Revisa tu internet e intenta de nuevo.'); }
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
    if (!r.ok) throw new Error((j && (j.message || j.msg || j.error_description)) || 'No se pudo completar la acción.');
    return j;
  }
  const cab = () => ({ apikey: C.anonKey, Authorization: 'Bearer ' + (jwt() || C.anonKey), 'Content-Type': 'application/json', 'Content-Profile': C.schema, 'Accept-Profile': C.schema });
  const rpc = (fn, args) => modo === 'demo' ? window.CITAS_MOCK.rpc(fn, args)
    : http(`${C.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: cab(), body: JSON.stringify(args || {}) });

  /* Sesión de la clienta: guarda el token que devuelve acceder(). Nunca el valor de un QR. */
  const cliente = {
    token: () => ls.get('token'),
    async entrar(codigo, ultimos4) {
      const r = await rpc('acceder', { p_codigo: codigo, p_ultimos4: ultimos4 });
      if (!r || !r.ok) throw new Error((r && r.mensaje) || 'No pudimos abrir tus citas.');
      ls.set('token', String(r.token)); return r.token;
    },
    salir: () => ls.set('token', null),
  };

  /* Sesión del personal. Demo: se elige un rol. Producción: correo y clave de Supabase Authentication. */
  const staff = {
    async sesion() { if (modo === 'demo') return window.CITAS_MOCK.staff(); if (!jwt()) return null; try { return await rpc('yo'); } catch (e) { ls.set('staff_jwt', null); return null; } },
    async entrar(a, b) {
      if (modo === 'demo') return window.CITAS_MOCK.entrarStaff(a);
      const j = await http(`${C.url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: C.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: a, password: b }) });
      ls.set('staff_jwt', j.access_token); const yo = await rpc('yo'); if (!yo) { ls.set('staff_jwt', null); throw new Error('Esa cuenta no es del equipo.'); } return yo;
    },
    salir() { if (modo === 'demo') window.CITAS_MOCK.salirStaff(); ls.set('staff_jwt', null); },
  };

  /* Mide cada clic a WhatsApp como conversión si la página ya tiene analítica (gtag o plausible). */
  const evento = (n, d) => { try { if (window.gtag) window.gtag('event', n, d || {}); if (window.plausible) window.plausible(n, { props: d || {} }); } catch (e) {} };
  const wa = (texto, numero) => `https://wa.me/${String(numero || D.waCliente || '').replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;

  window.CITAS = { modo, rpc, cliente, staff, evento, wa, ejemplo: () => modo === 'demo' ? window.CITAS_MOCK.ejemplo() : null, reiniciar: () => modo === 'demo' && window.CITAS_MOCK.reiniciar() };
})();
