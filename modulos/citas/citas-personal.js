/* citas-personal.js · panel del equipo: Hoy, Por confirmar, Agenda, Clientas, Resumen y Ajustes (solo administración).
   Todo lo que se muestra llega de funciones SQL protegidas por rol; aquí solo se pinta. Confirmar una cita abre WhatsApp con el código de la clienta. */
(() => {
  const { esc, hoy, sumaDias, lunes, dowCorto, diaNum, diaLargo, diaCorto, tel, aviso, accion, chip, primer, llenar } = window.CU;
  const T = Object.assign({ wa_confirmar: 'Hola {nombre}, tu cita de {servicio} está confirmada para el {dia} a las {hora}. Tu código para ver o cancelar tus citas es {codigo}: {url}' }, (window.CITASDATA || {}).textos || {});
  const $ = id => document.getElementById(id);
  const rpc = (f, a) => CITAS.rpc(f, a);
  const PEST = [['hoy', 'Hoy'], ['pend', 'Por confirmar'], ['agenda', 'Agenda'], ['clientas', 'Clientas'], ['resumen', 'Resumen'], ['ajustes', 'Ajustes']];
  let yo = null, tab = 'hoy', semana = lunes(hoy()), dlg;

  const urlMis = codigo => new URL('mis-citas.html', location.href).href.split('#')[0] + '?c=' + encodeURIComponent(codigo);
  const waCliente = (telefono, texto) => `https://wa.me/${String(telefono).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
  const mensajeConfirmacion = c => llenar(T.wa_confirmar, { nombre: primer(c.nombre), servicio: c.servicio, dia: diaLargo(c.dia), hora: c.hora, codigo: c.codigo, url: urlMis(c.codigo) });

  function abrir(html, alCerrar) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); const x = dlg.querySelector('[data-x]'); if (x) x.onclick = () => dlg.close(); dlg.onclose = alCerrar || null; }

  /* ---------- entrada ---------- */
  function entrada() {
    $('app').classList.add('ci-oculto'); $('b-salir').classList.add('ci-oculto'); $('yo-chip').textContent = '';
    const demo = CITAS.modo === 'demo';
    $('entrada-cont').innerHTML = demo ? `<div class="ci-card"><h3>Entra como…</h3><div class="ci-roles"><button type="button" data-r="admin"><b>Administración</b>Ve todo y cambia servicios, horario y cabinas.</button><button type="button" data-r="recepcion"><b>Recepción</b>Agenda, confirma citas y atiende clientas. Sin ajustes.</button></div></div><div class="ci-pista">Es una demo: no hay claves. En tu sistema real cada persona entra con su correo y su clave.</div>`
      : `<div class="ci-card"><h3>Entrar al panel</h3><form id="f-st" novalidate><label class="ci-campo">Correo<input name="e" type="email" autocomplete="username" required></label><label class="ci-campo">Clave<input name="p" type="password" autocomplete="current-password" required></label><p class="ci-err" id="e-st" role="alert"></p><button class="ci-btn" type="submit">Entrar</button></form></div>`;
    $('entrada').classList.remove('ci-oculto');
    if (demo) $('entrada-cont').querySelectorAll('[data-r]').forEach(b => b.onclick = async () => { await CITAS.staff.entrar(b.dataset.r); iniciar(); });
    else $('f-st').onsubmit = async e => { e.preventDefault(); const f = e.target, b = f.querySelector('button'); b.disabled = true; try { await CITAS.staff.entrar(f.e.value.trim(), f.p.value); iniciar(); } catch (x) { $('e-st').textContent = x.message; b.disabled = false; } };
  }

  async function iniciar() {
    yo = await CITAS.staff.sesion(); if (!yo) return entrada();
    $('entrada').classList.add('ci-oculto'); $('app').classList.remove('ci-oculto'); $('b-salir').classList.remove('ci-oculto');
    { const rol = yo.rol === 'admin' ? 'Administración' : 'Recepción'; $('yo-chip').textContent = yo.nombre === rol ? rol : `${yo.nombre} · ${rol}`; }
    pestanas(); ir(tab);
  }
  function pestanas(n) {
    const lista = PEST.filter(([k]) => k !== 'ajustes' || yo.rol === 'admin');
    $('tabs').innerHTML = lista.map(([k, t]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${k === tab}">${t}${k === 'pend' && n ? ` <span class="ci-punto">${n}</span>` : ''}</button>`).join('');
    $('tabs').querySelectorAll('button').forEach(b => b.onclick = () => ir(b.dataset.t));
  }
  async function ir(t) {
    tab = t; document.querySelectorAll('.ci-panel').forEach(p => p.hidden = p.dataset.panel !== t);
    $('tabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === t));
    try { await ({ hoy: pHoy, pend: pPend, agenda: pAgenda, clientas: pClientas, resumen: pResumen, ajustes: pAjustes })[t](); } catch (e) { $('p-' + t).innerHTML = `<p class="ci-err">${esc(e.message)}</p>`; }
    refrescarPunto();
  }
  async function refrescarPunto() { try { const r = await rpc('resumen'); pestanas(r.por_confirmar); } catch (e) {} }

  /* ---------- acciones sobre una cita ---------- */
  const filaCita = (c, conDia) => `<div class="ci-fila"><div><b>${conDia ? esc(diaCorto(c.dia)) + ' · ' : ''}${esc(c.hora)}–${esc(c.hora_fin)} · ${esc(c.nombre)}</b><small>${esc(c.servicio)} · ${esc(tel(c.telefono))}</small></div><div class="der">${chip(c.estado)}<button type="button" class="ci-btn linea peq" data-a="${c.id}">Acciones</button></div></div>`;
  function ligar(cont, lista) { cont.querySelectorAll('[data-a]').forEach(b => b.onclick = () => acciones(lista.find(c => c.id === +b.dataset.a))); }
  function acciones(c) {
    const pend = c.estado === 'pendiente', conf = c.estado === 'confirmada';
    abrir(`<h2>${esc(c.nombre)}</h2><p>${esc(c.servicio)}<br>${esc(diaLargo(c.dia))} · ${esc(c.hora)}–${esc(c.hora_fin)}<br>${chip(c.estado)}</p>
      <div style="display:grid;gap:10px;margin-top:14px">
      ${pend ? '<button type="button" class="ci-btn" data-do="confirmar">Confirmar y avisar por WhatsApp</button>' : ''}
      ${conf ? '<a class="ci-btn linea" data-do="wa">Escribirle por WhatsApp</a>' : ''}
      ${(pend || conf) ? '<button type="button" class="ci-btn linea" data-do="atendida">Marcar atendida</button><button type="button" class="ci-btn linea" data-do="mover">Mover de día u hora</button><button type="button" class="ci-btn linea" data-do="no_vino">No vino</button><button type="button" class="ci-btn rojo" data-do="cancelada">Cancelar cita</button>' : '<button type="button" class="ci-btn linea" data-do="confirmada">Reactivar como confirmada</button>'}
      </div><div class="ci-dlg-acc"><button type="button" class="ci-btn linea" data-x>Cerrar</button></div>`);
    dlg.querySelectorAll('[data-do]').forEach(b => b.onclick = async () => {
      const d = b.dataset.do;
      if (d === 'wa') { window.open(waCliente(c.telefono, mensajeConfirmacion(c)), '_blank', 'noopener'); return; }
      if (d === 'mover') return mover(c);
      const r = await accion(b, () => rpc('cita_estado', { p_cita: c.id, p_estado: d === 'confirmar' ? 'confirmada' : d }), d === 'confirmar' ? 'Cita confirmada' : 'Listo');
      if (r === undefined) return;
      if (d === 'confirmar') { return avisarWa(c); }
      dlg.close(); ir(tab);
    });
  }
  function avisarWa(c) {
    const m = mensajeConfirmacion(c);
    abrir(`<h2>Cita confirmada</h2><p>Envía este mensaje a ${esc(primer(c.nombre))}. Lleva su código para ver o cancelar sus citas.</p><div class="ci-msg">${esc(m)}</div>
      <div class="ci-dlg-acc"><button type="button" class="ci-btn linea" data-x>Después</button><a class="ci-btn" id="wa-ok" href="${esc(waCliente(c.telefono, m))}" target="_blank" rel="noopener">Abrir WhatsApp</a></div>`, () => ir(tab));
  }
  function mover(c) {
    abrir(`<h2>Mover cita</h2><p>${esc(c.nombre)} · ${esc(c.servicio)}</p><form id="f-mv" novalidate><label class="ci-campo">Día<input type="date" name="d" value="${esc(c.dia)}" min="${hoy()}"></label><label class="ci-campo">Hora<input type="time" name="h" value="${esc(c.hora)}" step="900"></label><p class="ci-err" id="e-mv" role="alert"></p>
      <div class="ci-dlg-acc"><button type="button" class="ci-btn linea" data-x>Cancelar</button><button class="ci-btn" type="submit">Mover</button></div></form>`);
    $('f-mv').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await rpc('mover_cita', { p_cita: c.id, p_dia: f.d.value, p_hora: f.h.value }); aviso('Cita movida', 'ok'); dlg.close(); ir(tab); } catch (x) { $('e-mv').textContent = x.message; } };
  }
  function nuevaCita() {
    rpc('servicios_lista').then(ss => {
      abrir(`<h2>Nueva cita</h2><form id="f-nc" novalidate><label class="ci-campo">Nombre<input name="n" maxlength="80"></label><label class="ci-campo">Celular<input name="t" inputmode="tel" placeholder="09XXXXXXXX"></label>
        <label class="ci-campo">Tratamiento<select name="s">${ss.map(s => `<option value="${s.id}">${esc(s.nombre)} (${s.duracion_min} min)</option>`).join('')}</select></label>
        <label class="ci-campo">Día<input type="date" name="d" value="${hoy()}" min="${hoy()}"></label><label class="ci-campo">Hora<input type="time" name="h" value="10:00" step="900"></label><p class="ci-err" id="e-nc" role="alert"></p>
        <div class="ci-dlg-acc"><button type="button" class="ci-btn linea" data-x>Cancelar</button><button class="ci-btn" type="submit">Guardar</button></div></form>`);
      $('f-nc').onsubmit = async e => { e.preventDefault(); const f = e.target; try { const r = await rpc('cita_staff', { p_nombre: f.n.value, p_telefono: f.t.value, p_servicio: +f.s.value, p_dia: f.d.value, p_hora: f.h.value }); aviso('Cita guardada y confirmada', 'ok'); const t = f.t.value; dlg.close(); ir(tab); void r; void t; } catch (x) { $('e-nc').textContent = x.message; } };
    });
  }

  /* ---------- pestañas ---------- */
  async function pHoy() {
    const l = await rpc('agenda', { p_desde: hoy(), p_hasta: hoy() }), act = l.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada' || c.estado === 'atendida');
    $('p-hoy').innerHTML = `<div class="ci-card"><h3>${esc(diaLargo(hoy()))}</h3><p><button type="button" class="ci-btn" id="nc">Nueva cita</button></p>${act.length ? act.map(c => filaCita(c)).join('') : '<p class="ci-vacio">Hoy no hay citas.</p>'}</div>`;
    ligar($('p-hoy'), l); $('nc').onclick = nuevaCita;
  }
  async function pPend() {
    const l = await rpc('pendientes');
    $('p-pend').innerHTML = `<div class="ci-card"><h3>Por confirmar</h3>${l.length ? l.map(c => `<div class="ci-fila"><div><b>${esc(c.nombre)}</b><small>${esc(c.servicio)} · ${esc(diaCorto(c.dia))} ${esc(c.hora)} · ${esc(tel(c.telefono))}</small></div><div class="der"><button type="button" class="ci-btn peq" data-cf="${c.id}">Confirmar</button><button type="button" class="ci-btn linea peq" data-a="${c.id}">Más</button></div></div>`).join('') : '<p class="ci-vacio">No hay citas por confirmar. 🎉</p>'}</div>`;
    ligar($('p-pend'), l);
    $('p-pend').querySelectorAll('[data-cf]').forEach(b => b.onclick = async () => { const c = l.find(x => x.id === +b.dataset.cf); const r = await accion(b, () => rpc('cita_estado', { p_cita: c.id, p_estado: 'confirmada' }), 'Cita confirmada'); if (r !== undefined) avisarWa(c); });
  }
  async function pAgenda() {
    const fin = sumaDias(semana, 6), l = await rpc('agenda', { p_desde: semana, p_hasta: fin });
    let h = `<div class="ci-card"><h3>Semana del ${esc(diaCorto(semana))}</h3><p style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="ci-btn linea peq" id="s-ant">← Anterior</button><button type="button" class="ci-btn linea peq" id="s-hoy">Esta semana</button><button type="button" class="ci-btn linea peq" id="s-sig">Siguiente →</button><button type="button" class="ci-btn peq" id="nc">Nueva cita</button></p>`;
    for (let i = 0; i < 7; i++) { const d = sumaDias(semana, i), del = l.filter(c => c.dia === d && c.estado !== 'cancelada'); h += `<h4 style="margin:16px 0 4px;font:600 .8rem var(--fx-font-txt);text-transform:uppercase;letter-spacing:.08em;opacity:.7">${esc(diaCorto(d))}${d === hoy() ? ' · hoy' : ''}</h4>${del.length ? del.map(c => filaCita(c)).join('') : '<p style="opacity:.55;margin:4px 0">Sin citas</p>'}`; }
    $('p-agenda').innerHTML = h + '</div>'; ligar($('p-agenda'), l);
    $('s-ant').onclick = () => { semana = sumaDias(semana, -7); pAgenda(); }; $('s-sig').onclick = () => { semana = sumaDias(semana, 7); pAgenda(); }; $('s-hoy').onclick = () => { semana = lunes(hoy()); pAgenda(); }; $('nc').onclick = nuevaCita;
  }
  async function pClientas() {
    const l = await rpc('clientas_lista');
    $('p-clientas').innerHTML = `<div class="ci-card"><h3>Clientas (${l.length})</h3><label class="ci-campo"><span class="ci-lector">Buscar</span><input id="q" placeholder="Buscar por nombre o celular" autocomplete="off"></label><div id="cl-lista"></div></div>`;
    const pintar = f => { const q = f.toLowerCase(), d = f.replace(/\D/g, ''); const x = l.filter(c => !f || c.nombre.toLowerCase().includes(q) || (d.length >= 4 && c.telefono.includes(d.replace(/^0+/, '')))); $('cl-lista').innerHTML = x.length ? x.map(c => `<div class="ci-fila"><div><b>${esc(c.nombre)}</b><small>${esc(tel(c.telefono))} · ${esc(c.codigo)} · ${c.sesiones} atendidas</small></div><a class="ci-btn linea peq" href="${esc(waCliente(c.telefono, ''))}" target="_blank" rel="noopener">WhatsApp</a></div>`).join('') : '<p class="ci-vacio">Sin resultados.</p>'; };
    pintar(''); $('q').oninput = e => pintar(e.target.value.trim());
  }
  async function pResumen() {
    const r = await rpc('resumen'), max = Math.max(1, ...r.semana.map(x => x.n)), topMax = Math.max(1, ...r.top.map(x => x.n));
    $('p-resumen').innerHTML = `<div class="ci-kpis"><div class="ci-kpi"><small>Citas hoy</small><b>${r.hoy.citas}</b></div><div class="ci-kpi"><small>Atendidas hoy</small><b>${r.hoy.atendidas}</b></div><div class="ci-kpi"><small>Ocupación hoy</small><b>${r.hoy.ocupacion}%</b></div><div class="ci-kpi"><small>Por confirmar</small><b>${r.por_confirmar}</b></div><div class="ci-kpi"><small>Clientas</small><b>${r.clientas}</b></div><div class="ci-kpi"><small>Nuevas este mes</small><b>${r.mes.nuevas}</b></div></div>
      <div class="ci-rejilla"><div class="ci-card"><h3>Próximos 7 días</h3><div class="ci-semana">${r.semana.map(x => `<div><span>${x.n}</span><i style="height:${Math.round(x.n / max * 80)}px"></i><span>${esc(dowCorto(x.dia))}</span></div>`).join('')}</div></div>
      <div class="ci-card"><h3>Tratamientos más pedidos del mes</h3>${r.top.length ? r.top.map(x => `<div class="ci-barra"><span>${esc(x.nombre)}</span><div class="p"><div style="width:${x.n / topMax * 100}%"></div></div><b>${x.n}</b></div>`).join('') : '<p class="ci-vacio">Aún sin datos.</p>'}<p style="opacity:.75;margin-top:10px">Este mes: ${r.mes.atendidas} atendidas · ${r.mes.canceladas} canceladas · ${r.mes.no_vino} no vinieron.</p></div></div>`;
  }
  const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  async function pAjustes() {
    const a = await rpc('config_admin');
    $('p-ajustes').innerHTML = `<div class="ci-rejilla"><div class="ci-card"><h3>Camillas / cabinas</h3><p>Cuántas personas puedes atender a la vez. Define cuántas citas caben en la misma hora.</p><form id="f-cap"><label class="ci-campo">Cabinas<input type="number" name="c" min="1" max="10" value="${a.config.capacidad}"></label><button class="ci-btn" type="submit">Guardar</button></form></div>
      <div class="ci-card"><h3>Horario de atención</h3><form id="f-hor">${[1, 2, 3, 4, 5, 6, 7].map(d => { const h = a.horario.find(x => x.dia === d) || {}; return `<div class="ci-semanal"><span>${DIAS[d].slice(0, 3)}</span><input type="time" name="a${d}" value="${esc(h.abre || '')}" aria-label="${DIAS[d]} abre"><input type="time" name="c${d}" value="${esc(h.cierra || '')}" aria-label="${DIAS[d]} cierra"></div>`; }).join('')}<small style="display:block;margin:6px 0 12px;opacity:.75">Deja vacío el día que no atiendes.</small><button class="ci-btn" type="submit">Guardar horario</button></form></div></div>
      <div class="ci-card"><h3>Tratamientos</h3>${a.servicios.map(s => `<div class="ci-fila"><div><b>${esc(s.nombre)}</b><small>${esc(s.categoria)} · ${s.duracion_min} min · ${esc(window.CU.plata(s.precio))}${s.activo ? '' : ' · oculto'}</small></div><button type="button" class="ci-btn linea peq" data-sv="${s.id}">Editar</button></div>`).join('')}<p style="margin-top:12px"><button type="button" class="ci-btn" id="sv-nuevo">Agregar tratamiento</button></p></div>`;
    $('f-cap').onsubmit = async e => { e.preventDefault(); const b = e.target.querySelector('button'); await accion(b, () => rpc('config_guardar', { p_capacidad: +e.target.c.value, p_meta: a.config.sellos_meta }), 'Guardado'); };
    $('f-hor').onsubmit = async e => { e.preventDefault(); const f = e.target, b = f.querySelector('button'); await accion(b, async () => { for (let d = 1; d <= 7; d++) await rpc('horario_guardar', { p_dia: d, p_abre: f['a' + d].value || null, p_cierra: f['c' + d].value || null }); }, 'Horario guardado'); };
    const edit = s => { abrir(`<h2>${s ? 'Editar' : 'Nuevo'} tratamiento</h2><form id="f-sv" novalidate><label class="ci-campo">Nombre<input name="n" maxlength="80" value="${esc(s ? s.nombre : '')}"></label><label class="ci-campo">Categoría<input name="c" maxlength="40" value="${esc(s ? s.categoria : '')}"></label><label class="ci-campo">Descripción<textarea name="d" maxlength="240">${esc(s && s.descripcion || '')}</textarea></label>
      <label class="ci-campo">Duración (minutos)<input type="number" name="m" min="15" max="240" step="5" value="${s ? s.duracion_min : 60}"></label><label class="ci-campo">Precio<input name="p" maxlength="20" placeholder="Ej. 25 o «Desde 40»" value="${esc(s && s.precio || '')}"></label><label class="ci-campo" style="grid-auto-flow:column;justify-content:start;align-items:center"><input type="checkbox" name="a" ${!s || s.activo ? 'checked' : ''} style="width:auto;min-height:0"> Visible para reservar</label><p class="ci-err" id="e-sv" role="alert"></p>
      <div class="ci-dlg-acc"><button type="button" class="ci-btn linea" data-x>Cancelar</button><button class="ci-btn" type="submit">Guardar</button></div></form>`);
      $('f-sv').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await rpc('servicio_guardar', { p_id: s ? s.id : null, p_nombre: f.n.value, p_categoria: f.c.value, p_descripcion: f.d.value, p_duracion: +f.m.value, p_precio: f.p.value, p_fidelidad: s ? s.fidelidad : false, p_activo: f.a.checked }); aviso('Guardado', 'ok'); dlg.close(); pAjustes(); } catch (x) { $('e-sv').textContent = x.message; } }; };
    $('p-ajustes').querySelectorAll('[data-sv]').forEach(b => b.onclick = () => edit(a.servicios.find(s => s.id === +b.dataset.sv))); $('sv-nuevo').onclick = () => edit(null);
  }

  dlg = $('dlg');
  $('b-salir').onclick = () => { CITAS.staff.salir(); entrada(); };
  iniciar();
})();
