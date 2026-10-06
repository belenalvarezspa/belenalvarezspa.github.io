/* citas-mock.js · backend de DEMOSTRACIÓN del módulo de citas. Imita las funciones SQL de modulos/citas/supabase/migrations
   (mismos nombres, parámetros p_*, respuestas y reglas) con datos inventados guardados en localStorage.
   Lo propio de cada cliente llega en window.CITASDATA.mock: prefijo del código, camillas, horario y servicios de ejemplo.
   Cuando la página corre en modo "supabase", este archivo no se usa. Si cambia una regla en el SQL, cambia aquí también. */
(() => {
  const D = window.DEMO || {}, M = (window.CITASDATA || {}).mock || {};
  const K = (D.claveDemo || 'citas') + '_cm';
  const OFF = '-05:00';
  const pad = n => String(n).padStart(2, '0');
  const diaDe = ms => new Date(ms - 5 * 3600e3).toISOString().slice(0, 10);
  const horaDe = ms => new Date(ms - 5 * 3600e3).toISOString().slice(11, 16);
  const hoy = () => diaDe(Date.now());
  const sumaDias = (d, n) => diaDe(new Date(d + 'T12:00:00' + OFF).getTime() + n * 864e5);
  const dowIso = d => { const x = new Date(d + 'T12:00:00' + OFF).getUTCDay(); return x === 0 ? 7 : x; };
  const aMs = (dia, hora) => new Date(`${dia}T${hora}:00${OFF}`).getTime();
  const mins = h => +String(h).slice(0, 2) * 60 + +String(h).slice(3, 5);
  const hhmm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const aleat = n => Array.from({ length: n }, () => ALFA[Math.floor(Math.random() * ALFA.length)]).join('');
  const hex = n => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
  const tel = p => { const d = String(p || '').replace(/\D/g, ''); return /^09\d{8}$/.test(d) ? '593' + d.slice(1) : /^593\d{9}$/.test(d) ? d : ''; };
  const fallo = m => { throw new Error(m); };

  let mem = null;
  const leer = () => { try { const t = localStorage.getItem(K); if (t) return JSON.parse(t); } catch (e) {} return mem; };
  const guardar = s => { mem = s; try { localStorage.setItem(K, JSON.stringify(s)); } catch (e) {} };
  let S = null;

  function semilla() {
    const cfg = Object.assign({ prefijo: 'CL', capacidad: 2, paso_min: 30, anticipacion_min: 60, max_dias: 60, max_citas_activas: 3, sellos_meta: 5 }, M.config || {});
    const horario = (M.horario || [1, 2, 3, 4, 5, 6].map(d => ({ dia: d, abre: '09:00', cierra: d === 6 ? '14:00' : '18:00' }))).map(h => ({ dia: h.dia, abre: h.abre, cierra: h.cierra }));
    const servicios = (M.servicios || []).map((s, i) => ({ id: i + 1, nombre: s.nombre, categoria: s.categoria || 'General', descripcion: s.descripcion || null, duracion_min: s.duracion_min || 60, precio: s.precio ?? null, fidelidad: false, orden: i + 1, activo: true }));
    const st = { cfg, horario, servicios, clientas: [], citas: [], seq: { c: 0, ct: 0, s: servicios.length }, intentos: {}, ahora: Date.now() };
    const nuevaClienta = (nombre, telefono, codigo) => { const c = { id: ++st.seq.c, token: uuid(), qr: hex(16), codigo: codigo || `${cfg.prefijo}-${aleat(6)}`, nombre, telefono: tel(telefono), creado: new Date().toISOString() }; st.clientas.push(c); return c; };
    const dias = []; for (let i = 1; dias.length < 6 && i < 40; i++) { const d = sumaDias(hoy(), i); if (horario.some(h => h.dia === dowIso(d))) dias.push(d); }
    const ej = (M.clientas || [{ nombre: 'Camila Ruiz', telefono: '0991234567' }, { nombre: 'Andrea Salazar', telefono: '0987654321' }, { nombre: 'Daniela Mora', telefono: '0998765432' }, { nombre: 'Lucía Paredes', telefono: '0995551234' }]);
    ej.forEach((x, i) => nuevaClienta(x.nombre, x.telefono, i === 0 ? (M.ejemplo || {}).codigo || `${cfg.prefijo}-7K3Q9V` : undefined));
    if (st.clientas[0] && !(M.clientas && M.clientas[0] && M.clientas[0].telefono)) st.clientas[0].telefono = '593991234567';
    if (M.ejemplo && M.ejemplo.ultimos4) st.clientas[0].telefono = st.clientas[0].telefono.slice(0, 8) + M.ejemplo.ultimos4;
    const cita = (ci, si, dia, hora, estado) => { const s = servicios[si % servicios.length]; if (!s) return; const ini = aMs(dia, hora); st.citas.push({ id: ++st.seq.ct, clienta_id: st.clientas[ci % st.clientas.length].id, servicio_id: s.id, inicio: ini, fin: ini + s.duracion_min * 60000, estado, creado: new Date(Date.now() - (ci + 1) * 3600e3).toISOString() }); };
    if (servicios.length && dias.length) {
      cita(0, 0, dias[0], '10:00', 'confirmada'); cita(1, 1, dias[0], '11:00', 'pendiente'); cita(2, 2, dias[1], '09:30', 'pendiente'); cita(3, 0, dias[1], '15:00', 'confirmada');
      cita(0, 1, dias[3] || dias[2], '16:00', 'pendiente'); cita(1, 3, dias[2], '12:00', 'confirmada');
      for (let k = 1; k <= 8; k++) { const dd = sumaDias(hoy(), -k * 2); if (horario.some(h => h.dia === dowIso(dd))) cita(k, k, dd, k % 2 ? '10:00' : '15:00', k % 5 === 0 ? 'no_vino' : k % 4 === 0 ? 'cancelada' : 'atendida'); }
    }
    return st;
  }
  const estado = () => { if (S) return S; S = leer(); if (!S) { S = semilla(); guardar(S); } return S; };
  const salvar = () => guardar(S);

  /* ---------- sesión del personal (demo: se elige un rol) ---------- */
  const rolKey = K + '_rol';
  const rol = () => { try { return sessionStorage.getItem(rolKey) || null; } catch (e) { return mem && mem._rol || null; } };
  const esStaff = () => { if (!rol()) fallo('No autorizado'); };
  const esAdmin = () => { if (rol() !== 'admin') fallo('Solo admin.'); };

  /* ---------- reglas de agenda (mismas que _reservar y disponibilidad en SQL) ---------- */
  const servicio = id => estado().servicios.find(s => s.id === +id);
  const horarioDe = d => estado().horario.find(h => h.dia === dowIso(d));
  const ocupadas = (ini, fin, excluir) => estado().citas.filter(c => (c.estado === 'pendiente' || c.estado === 'confirmada') && c.inicio < fin && c.fin > ini && c.id !== excluir).length;
  const slots = (s, d) => {
    const cf = estado().cfg, h = horarioDe(d), r = []; if (!h) return r;
    for (let m = mins(h.abre); m + s.duracion_min <= mins(h.cierra); m += cf.paso_min) {
      const ini = aMs(d, hhmm(m)); r.push({ hora: hhmm(m), libre: ini > Date.now() + cf.anticipacion_min * 60000 && ocupadas(ini, ini + s.duracion_min * 60000) < cf.capacidad });
    }
    return r;
  };
  const reservar = (cl, servId, d, hora) => {
    const cf = estado().cfg, s = servicio(servId); if (!s || !s.activo) fallo('Servicio no disponible.');
    if (!d || d < hoy() || d > sumaDias(hoy(), cf.max_dias)) fallo(`Elige una fecha dentro de los próximos ${cf.max_dias} días.`);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora || '')) fallo('Hora no válida.');
    const h = horarioDe(d); if (!h) fallo('Ese día no atendemos.');
    if (mins(hora) < mins(h.abre) || mins(hora) + s.duracion_min > mins(h.cierra) || (mins(hora) - mins(h.abre)) % cf.paso_min) fallo('Ese horario no está disponible.');
    const ini = aMs(d, hora), fin = ini + s.duracion_min * 60000;
    if (ini < Date.now() + cf.anticipacion_min * 60000) fallo(`Elige un horario con al menos ${cf.anticipacion_min} minutos de anticipación.`);
    if (estado().citas.filter(c => c.clienta_id === cl.id && (c.estado === 'pendiente' || c.estado === 'confirmada') && c.fin > Date.now()).length >= cf.max_citas_activas) fallo(`Ya tienes ${cf.max_citas_activas} citas por atender. Cancela una o espera a que se confirmen.`);
    if (ocupadas(ini, fin) >= cf.capacidad) fallo('Ese horario se acaba de llenar. Elige otro, por favor.');
    const c = { id: ++estado().seq.ct, clienta_id: cl.id, servicio_id: s.id, inicio: ini, fin, estado: 'pendiente', creado: new Date().toISOString() };
    estado().citas.push(c); return c.id;
  };
  const crearClienta = (nombre, telefono) => { const st = estado(); const c = { id: ++st.seq.c, token: uuid(), qr: hex(16), codigo: `${st.cfg.prefijo}-${aleat(6)}`, nombre: String(nombre).trim().slice(0, 80), telefono, creado: new Date().toISOString() }; st.clientas.push(c); return c; };

  const fechaHora = ms => ({ dia: diaDe(ms), hora: horaDe(ms) });
  const jsonCita = c => { const s = servicio(c.servicio_id), f = fechaHora(c.inicio), g = fechaHora(c.fin); return { id: c.id, servicio_id: c.servicio_id, servicio: s ? s.nombre : '', estado: c.estado, dia: f.dia, hora: f.hora, hora_fin: g.hora, cancelable: c.inicio > Date.now() + 6 * 3600e3 }; };
  const jsonClienta = (cl, privado) => ({
    nombre: cl.nombre, codigo: cl.codigo, qr: privado ? undefined : cl.qr, telefono: privado ? cl.telefono : undefined, desde: cl.creado, meta: estado().cfg.sellos_meta, servicios: [],
    citas: estado().citas.filter(c => c.clienta_id === cl.id && (c.estado === 'pendiente' || c.estado === 'confirmada') && c.fin > Date.now()).sort((a, b) => a.inicio - b.inicio).map(jsonCita), historial: [],
  });
  const porToken = t => estado().clientas.find(c => c.token === String(t));
  const porRef = r => { const x = String(r || '').trim().replace(/^.*[?&]t=/, ''); return estado().clientas.find(c => c.qr === x || c.codigo.toUpperCase() === x.toUpperCase()); };

  const F = {
    /* ---------- la clienta ---------- */
    servicios_lista() { return estado().servicios.filter(s => s.activo).sort((a, b) => a.orden - b.orden).map(s => ({ id: s.id, nombre: s.nombre, categoria: s.categoria, descripcion: s.descripcion, duracion_min: s.duracion_min, precio: s.precio })); },
    disponibilidad({ p_servicio, p_dia }) {
      const s = servicio(p_servicio), cf = estado().cfg; if (!s || !s.activo || !p_dia || p_dia < hoy() || p_dia > sumaDias(hoy(), cf.max_dias)) return []; return slots(s, p_dia);
    },
    dias_libres({ p_servicio, p_desde, p_dias }) {
      const s = servicio(p_servicio), cf = estado().cfg; if (!s || !s.activo) return [];
      const desde = p_desde && p_desde > hoy() ? p_desde : hoy(), n = Math.min(Math.max(p_dias || 14, 1), 31), hasta = sumaDias(hoy(), cf.max_dias), r = [];
      for (let i = 0; i < n; i++) { const d = sumaDias(desde, i); if (d > hasta) break; r.push({ dia: d, libres: slots(s, d).filter(x => x.libre).length }); }
      return r;
    },
    agendar({ p_nombre, p_telefono, p_servicio, p_dia, p_hora }) {
      const t = tel(p_telefono); if (String(p_nombre || '').trim().length < 2) fallo('Escribe tu nombre y apellido.'); if (!t) fallo('Escribe un celular válido (09...).');
      let cl = estado().clientas.find(c => c.telefono === t);
      if (!cl) { if (estado().clientas.filter(c => Date.now() - new Date(c.creado) < 3600e3).length >= 20) fallo('Hay muchas solicitudes en este momento. Intenta en un rato o escríbenos por WhatsApp.'); cl = crearClienta(p_nombre, t); }
      const id = reservar(cl, p_servicio, p_dia, p_hora); salvar();
      return { ok: true, cita: id, estado: 'pendiente' };          // sin token ni código: se entregan por WhatsApp al confirmar
    },
    agendar_token({ p_token, p_servicio, p_dia, p_hora }) {
      const cl = porToken(p_token); if (!cl) fallo('No encontramos tu tarjeta.'); const id = reservar(cl, p_servicio, p_dia, p_hora); salvar(); return { ok: true, cita: id, estado: 'pendiente' };
    },
    acceder({ p_codigo, p_ultimos4 }) {
      const k = 'cod:' + String(p_codigo || '').trim().toUpperCase(), it = estado().intentos, ahora = Date.now(), ult = String(p_ultimos4 || '').replace(/\D/g, '');
      if ((it[k] && it[k].hasta > ahora) || (it.global && it.global.hasta > ahora)) return { ok: false, bloqueado: true, mensaje: 'Demasiados intentos. Prueba de nuevo en un rato o escríbenos por WhatsApp.' };
      const cl = estado().clientas.find(c => c.codigo.toUpperCase() === String(p_codigo || '').trim().toUpperCase() && ult.length === 4 && c.telefono.slice(-4) === ult);
      if (cl) { delete it[k]; salvar(); return { ok: true, token: cl.token }; }
      const a = it[k] = (it[k] && ahora - it[k].desde < 15 * 60000) ? { desde: it[k].desde, n: it[k].n + 1 } : { desde: ahora, n: 1 };
      if (a.n >= 5) it[k] = { hasta: ahora + 30 * 60000 };
      const g = it.global = (it.global && ahora - it.global.desde < 10 * 60000 && !it.global.hasta) ? { desde: it.global.desde, n: it.global.n + 1 } : { desde: ahora, n: 1 };
      if (g.n >= 60) it.global = { hasta: ahora + 10 * 60000 };
      salvar(); return { ok: false, mensaje: 'Código o últimos 4 dígitos incorrectos.' };
    },
    tarjeta({ p_token }) { const cl = porToken(p_token); if (!cl) fallo('No encontramos tu tarjeta.'); return jsonClienta(cl, false); },
    cancelar({ p_token, p_cita }) {
      const cl = porToken(p_token), c = cl && estado().citas.find(x => x.id === +p_cita && x.clienta_id === cl.id); if (!c) fallo('Cita no encontrada.');
      if (c.estado !== 'pendiente' && c.estado !== 'confirmada') fallo('Esta cita ya no se puede cancelar.'); if (c.inicio < Date.now() + 6 * 3600e3) fallo('Faltan menos de 6 horas. Escríbenos por WhatsApp.');
      c.estado = 'cancelada'; salvar(); return null;
    },
    ping() { return true; },

    /* ---------- el personal ---------- */
    yo() { const r = rol(); return r ? { nombre: r === 'admin' ? 'Administración' : 'Recepción', rol: r } : null; },
    agenda({ p_desde, p_hasta }) {
      esStaff(); const d0 = aMs(p_desde, '00:00'), d1 = aMs(p_hasta, '00:00') + 864e5;
      return estado().citas.filter(c => c.inicio >= d0 && c.inicio < d1).sort((a, b) => a.inicio - b.inicio).map(c => { const cl = estado().clientas.find(x => x.id === c.clienta_id), s = servicio(c.servicio_id), f = fechaHora(c.inicio), g = fechaHora(c.fin);
        return { id: c.id, estado: c.estado, dia: f.dia, hora: f.hora, hora_fin: g.hora, servicio_id: s.id, servicio: s.nombre, categoria: s.categoria, duracion: s.duracion_min, nombre: cl.nombre, telefono: cl.telefono, codigo: cl.codigo, ref: cl.qr, progreso: 0, gratis: false, sellada: false, creado: c.creado }; });
    },
    pendientes() {
      esStaff(); return estado().citas.filter(c => c.estado === 'pendiente' && c.fin > Date.now()).sort((a, b) => a.inicio - b.inicio).map(c => { const cl = estado().clientas.find(x => x.id === c.clienta_id), s = servicio(c.servicio_id), f = fechaHora(c.inicio), g = fechaHora(c.fin);
        return { id: c.id, estado: c.estado, dia: f.dia, hora: f.hora, hora_fin: g.hora, servicio: s.nombre, nombre: cl.nombre, telefono: cl.telefono, codigo: cl.codigo, creado: c.creado }; });
    },
    buscar({ p_q }) {
      esStaff(); const q = String(p_q || '').trim().toLowerCase(), d = String(p_q || '').replace(/\D/g, '').replace(/^0+/, '');
      return estado().clientas.filter(c => (q.length >= 2 && c.nombre.toLowerCase().includes(q)) || (d.length >= 4 && c.telefono.includes(d)) || c.codigo.toLowerCase() === q).sort((a, b) => a.nombre.localeCompare(b.nombre)).slice(0, 25).map(c => ({ ref: c.qr, codigo: c.codigo, nombre: c.nombre, telefono: c.telefono }));
    },
    ficha({ p_ref }) { esStaff(); const cl = porRef(p_ref); if (!cl) fallo('No encontramos esa tarjeta.'); return jsonClienta(cl, true); },
    clientas_lista() {
      esStaff(); return estado().clientas.map(c => { const mis = estado().citas.filter(x => x.clienta_id === c.id); const ult = mis.filter(x => x.estado === 'atendida').sort((a, b) => b.inicio - a.inicio)[0];
        return { ref: c.qr, codigo: c.codigo, nombre: c.nombre, telefono: c.telefono, creado: c.creado, ultima: ult ? new Date(ult.inicio).toISOString() : null, sesiones: mis.filter(x => x.estado === 'atendida').length, gratis: 0 }; })
        .sort((a, b) => String(b.ultima || '').localeCompare(String(a.ultima || '')));
    },
    registrar({ p_nombre, p_telefono }) {
      esStaff(); const t = tel(p_telefono); if (String(p_nombre || '').trim().length < 2) fallo('Escribe el nombre.'); if (!t) fallo('Escribe un celular válido (09...).');
      const ya = estado().clientas.find(c => c.telefono === t); if (ya) fallo(`Ese celular ya tiene tarjeta (${ya.codigo}).`);
      const cl = crearClienta(p_nombre, t); salvar(); return jsonClienta(cl, true);
    },
    cita_estado({ p_cita, p_estado }) {
      esStaff(); if (!['pendiente', 'confirmada', 'atendida', 'cancelada', 'no_vino'].includes(p_estado)) fallo('Estado no válido.');
      const c = estado().citas.find(x => x.id === +p_cita); if (!c) fallo('Cita no encontrada.');
      if ((p_estado === 'pendiente' || p_estado === 'confirmada') && c.estado !== 'pendiente' && c.estado !== 'confirmada' && ocupadas(c.inicio, c.fin, c.id) >= estado().cfg.capacidad) fallo('Ese horario ya está lleno. Muévela a otra hora.');
      c.estado = p_estado; salvar(); return null;
    },
    mover_cita({ p_cita, p_dia, p_hora }) {
      esStaff(); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(p_hora || '')) fallo('Hora no válida.');
      const c = estado().citas.find(x => x.id === +p_cita); if (!c) fallo('Cita no encontrada.');
      const ini = aMs(p_dia, p_hora), dur = c.fin - c.inicio; if (ocupadas(ini, ini + dur, c.id) >= estado().cfg.capacidad) fallo('Ese horario ya está lleno.');
      c.inicio = ini; c.fin = ini + dur; if (c.estado === 'cancelada' || c.estado === 'no_vino') c.estado = 'confirmada'; salvar(); return null;
    },
    cita_staff({ p_nombre, p_telefono, p_servicio, p_dia, p_hora }) {
      esStaff(); const t = tel(p_telefono); if (!t) fallo('Escribe un celular válido (09...).');
      let cl = estado().clientas.find(c => c.telefono === t); if (!cl) { if (String(p_nombre || '').trim().length < 2) fallo('Escribe el nombre.'); cl = crearClienta(p_nombre, t); }
      const id = reservar(cl, p_servicio, p_dia, p_hora); estado().citas.find(x => x.id === id).estado = 'confirmada'; salvar();
      return { cita: id, codigo: cl.codigo, nombre: cl.nombre };
    },
    resumen() {
      esStaff(); const st = estado(), h0 = hoy(), d0 = aMs(h0, '00:00'), d1 = d0 + 864e5, m0 = aMs(h0.slice(0, 8) + '01', '00:00');
      const act = c => ['pendiente', 'confirmada', 'atendida'].includes(c.estado), hoyC = st.citas.filter(c => c.inicio >= d0 && c.inicio < d1), hh = horarioDe(h0);
      const abiertos = hh ? (mins(hh.cierra) - mins(hh.abre)) * st.cfg.capacidad : 0, ocup = hoyC.filter(act).reduce((a, c) => a + (c.fin - c.inicio) / 60000, 0);
      const top = {}; st.citas.filter(c => c.inicio >= m0 && ['confirmada', 'atendida', 'pendiente'].includes(c.estado)).forEach(c => { const n = servicio(c.servicio_id).nombre; top[n] = (top[n] || 0) + 1; });
      return {
        hoy: { citas: hoyC.filter(act).length, atendidas: hoyC.filter(c => c.estado === 'atendida').length, sellos: 0, canjes: 0, ocupacion: abiertos ? Math.round(100 * ocup / abiertos) : 0 },
        por_confirmar: st.citas.filter(c => c.estado === 'pendiente' && c.fin > Date.now()).length,
        mes: { atendidas: st.citas.filter(c => c.inicio >= m0 && c.estado === 'atendida').length, no_vino: st.citas.filter(c => c.inicio >= m0 && c.estado === 'no_vino').length, canceladas: st.citas.filter(c => c.inicio >= m0 && c.estado === 'cancelada').length, sellos: 0, canjes: 0, nuevas: st.clientas.filter(c => new Date(c.creado).getTime() >= m0).length },
        clientas: st.clientas.length, top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nombre, n]) => ({ nombre, n })),
        semana: Array.from({ length: 7 }, (_, k) => { const d = sumaDias(h0, k), a = aMs(d, '00:00'); return { dia: d, n: st.citas.filter(c => c.inicio >= a && c.inicio < a + 864e5 && act(c)).length }; }), gratis_listas: 0,
      };
    },
    config_admin() {
      esStaff(); const st = estado();
      return { config: { id: 1, prefijo: st.cfg.prefijo, capacidad: st.cfg.capacidad, paso_min: st.cfg.paso_min, sellos_meta: st.cfg.sellos_meta, anticipacion_min: st.cfg.anticipacion_min, max_dias: st.cfg.max_dias },
        servicios: st.servicios.slice().sort((a, b) => a.orden - b.orden), horario: [1, 2, 3, 4, 5, 6, 7].map(d => { const h = st.horario.find(x => x.dia === d); return { dia: d, abre: h ? h.abre : null, cierra: h ? h.cierra : null }; }),
        equipo: rol() === 'admin' ? [{ user_id: 'demo-admin', nombre: 'Administración', rol: 'admin', email: 'admin@ejemplo.ec', yo: true }, { user_id: 'demo-recepcion', nombre: 'Recepción', rol: 'recepcion', email: 'recepcion@ejemplo.ec', yo: false }] : null };
    },
    config_guardar({ p_capacidad, p_meta }) { esAdmin(); if (p_capacidad < 1 || p_capacidad > 10) fallo('Cabinas entre 1 y 10.'); if (p_meta < 2 || p_meta > 20) fallo('Sellos entre 2 y 20.'); estado().cfg.capacidad = +p_capacidad; estado().cfg.sellos_meta = +p_meta; salvar(); return null; },
    servicio_guardar({ p_id, p_nombre, p_categoria, p_descripcion, p_duracion, p_precio, p_fidelidad, p_activo }) {
      esAdmin(); if (String(p_nombre || '').trim().length < 2) fallo('Escribe el nombre del servicio.'); if (!p_duracion || p_duracion < 15 || p_duracion > 240) fallo('Duración entre 15 y 240 min.');
      const st = estado(); let s = p_id ? st.servicios.find(x => x.id === +p_id) : null;
      if (!s) { s = { id: ++st.seq.s, orden: Math.max(0, ...st.servicios.map(x => x.orden)) + 1 }; st.servicios.push(s); }
      Object.assign(s, { nombre: String(p_nombre).trim(), categoria: String(p_categoria || '').trim() || 'General', descripcion: String(p_descripcion || '').trim() || null, duracion_min: +p_duracion, precio: String(p_precio || '').trim() || null, fidelidad: p_fidelidad ?? true, activo: p_activo ?? true });
      salvar(); return s.id;
    },
    horario_guardar({ p_dia, p_abre, p_cierra }) {
      esAdmin(); const st = estado(); if (p_dia < 1 || p_dia > 7) fallo('Día no válido.');
      if (!p_abre || !p_cierra) { st.horario = st.horario.filter(h => h.dia !== +p_dia); salvar(); return null; }
      if (mins(p_cierra) <= mins(p_abre)) fallo('La hora de cierre debe ser después de la de apertura.');
      const h = st.horario.find(x => x.dia === +p_dia); if (h) { h.abre = p_abre; h.cierra = p_cierra; } else st.horario.push({ dia: +p_dia, abre: p_abre, cierra: p_cierra }); salvar(); return null;
    },
  };

  window.CITAS_MOCK = {
    async rpc(fn, args) { await new Promise(r => setTimeout(r, 120)); if (!F[fn]) throw new Error('Función no disponible en la demo: ' + fn); estado(); return JSON.parse(JSON.stringify(F[fn](args || {}) ?? null)); },
    staff: () => { const r = rol(); return r ? { nombre: r === 'admin' ? 'Administración' : 'Recepción', rol: r } : null; },
    entrarStaff(r) { try { sessionStorage.setItem(rolKey, r); } catch (e) { mem = mem || {}; mem._rol = r; } return window.CITAS_MOCK.staff(); },
    salirStaff() { try { sessionStorage.removeItem(rolKey); } catch (e) {} },
    ejemplo() { const c = estado().clientas[0]; return { codigo: c.codigo, ultimos4: c.telefono.slice(-4) }; },
    reiniciar() { try { localStorage.removeItem(K); sessionStorage.removeItem(rolKey); } catch (e) {} S = null; mem = null; },
  };
})();
