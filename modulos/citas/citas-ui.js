/* citas-ui.js · ayudas de pantalla compartidas por las páginas de citas: textos seguros, fechas en hora de Guayaquil y avisos.
   Todo texto que llega de la base pasa por esc() antes de ir a innerHTML. */
(() => {
  const TZ = 'America/Guayaquil';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dia = t => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ });
  const hoy = () => dia(Date.now());
  const sumaDias = (d, n) => dia(new Date(d + 'T12:00:00-05:00').getTime() + n * 864e5);
  const dowN = d => { const x = new Date(d + 'T12:00:00-05:00').getUTCDay(); return x === 0 ? 7 : x; };
  const lunes = d => sumaDias(d, 1 - dowN(d));
  const dowCorto = d => new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-EC', { timeZone: TZ, weekday: 'short' }).replace('.', '');
  const diaNum = d => String(+d.slice(8));
  const mesCorto = d => new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-EC', { timeZone: TZ, month: 'short' }).replace('.', '');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const diaLargo = d => cap(new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-EC', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }));
  const diaCorto = d => cap(new Date(d + 'T12:00:00-05:00').toLocaleDateString('es-EC', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''));
  const primer = n => String(n || '').split(' ')[0];
  const tel = t => { const d = String(t || '').replace(/\D/g, ''); return /^593\d{9}$/.test(d) ? '0' + d.slice(3, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8) : t; };
  const plata = p => (p === null || p === undefined || p === '') ? 'A consultar' : (/^\d+([.,]\d+)?$/.test(String(p).trim()) ? '$' + String(p).trim() : String(p));

  function aviso(msg, tipo) {
    let c = document.getElementById('ci-avisos'); if (!c) { c = document.createElement('div'); c.id = 'ci-avisos'; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite'); document.body.append(c); }
    const a = document.createElement('div'); a.className = 'ci-aviso ' + (tipo || ''); a.textContent = msg; c.append(a);
    setTimeout(() => { a.classList.add('sale'); setTimeout(() => a.remove(), 300); }, tipo === 'err' ? 5200 : 3200);
  }
  /* Ejecuta una acción de la base con el botón bloqueado y el error a la vista. */
  async function accion(boton, fn, ok) {
    if (boton) boton.disabled = true;
    try { const r = await fn(); if (ok) aviso(typeof ok === 'function' ? ok(r) : ok, 'ok'); return r; }
    catch (e) { aviso(e.message || 'No se pudo completar la acción.', 'err'); return undefined; }
    finally { if (boton && boton.isConnected) boton.disabled = false; }
  }
  /* Reemplaza {nombre}, {servicio}… en una plantilla de mensaje */
  const llenar = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));
  const wa = (texto, numero, origen) => { window.CITAS && CITAS.evento('click_whatsapp', { origen: origen || 'citas' }); return CITAS.wa(texto, numero); };
  const estado = { pendiente: ['Por confirmar', 'aviso'], confirmada: ['Confirmada', 'ok'], atendida: ['Atendida', 'suave'], cancelada: ['Cancelada', 'suave'], no_vino: ['No vino', 'suave'] };
  const chip = e => { const x = estado[e] || [e, 'suave']; return `<span class="ci-chip ${x[1]}">${esc(x[0])}</span>`; };

  window.CU = { esc, dia, hoy, sumaDias, dowN, lunes, dowCorto, diaNum, mesCorto, diaLargo, diaCorto, primer, tel, plata, aviso, accion, llenar, wa, chip, TZ };
})();
