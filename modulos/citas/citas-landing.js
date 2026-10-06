/* citas-landing.js · reserva en la landing: servicio → día → hora → datos. Los horarios libres salen de la base (dias_libres / disponibilidad),
   nunca se calculan aquí: lo que se muestra es lo que la base aceptará. Al terminar, la clienta puede avisar por WhatsApp (clic medido).
   Uso: Reserva.iniciar('#reserva'); Reserva.elegir(idServicio) o Reserva.elegirPorNombre('Limpieza facial') desde el diagnóstico. */
(() => {
  const { esc, hoy, sumaDias, dowCorto, diaNum, mesCorto, diaLargo, plata, aviso, accion, llenar } = window.CU;
  const T = Object.assign({
    paso1: 'Elige tu tratamiento', paso1_sub: 'Toca el que quieres reservar.', paso2: 'Elige el día', paso2_sub: 'Solo se muestran los días con espacio.',
    paso3: 'Elige la hora', paso3_sub: 'Estos horarios están libres ahora.', paso4: 'Tus datos', paso4_sub: 'Para guardar tu cita y poder confirmarla contigo.',
    boton: 'Solicitar mi cita', listo_titulo: '¡Listo, {nombre}!', listo_txt: 'Recibimos tu solicitud. Te confirmamos por WhatsApp y ahí te enviamos tu código para ver o cancelar tu cita.',
    wa_cita: 'Hola, soy {nombre}. Acabo de pedir una cita desde la web: {servicio}, {dia} a las {hora}.', wa_boton: 'Avisar por WhatsApp', otra: 'Reservar otra cita', sin_dias: 'No hay espacio en estos días. Prueba con los siguientes o escríbenos por WhatsApp.',
  }, (window.CITASDATA || {}).textos || {});
  const S = { servs: [], serv: null, desde: null, dias: [], dia: null, horas: [], hora: null, listo: null, cargando: false };
  let raiz, wa, wa_num;
  const PAG = 14;

  const rpc = (f, a) => CITAS.rpc(f, a);
  async function cargarServicios() { try { S.servs = (await rpc('servicios_lista')) || []; } catch (e) { S.servs = []; aviso(e.message, 'err'); } }
  async function cargarDias() {
    S.cargando = true; pintar();
    try { S.dias = (await rpc('dias_libres', { p_servicio: S.serv.id, p_desde: S.desde, p_dias: PAG })) || []; } catch (e) { S.dias = []; aviso(e.message, 'err'); }
    S.cargando = false; pintar();
  }
  async function cargarHoras() {
    try { S.horas = (await rpc('disponibilidad', { p_servicio: S.serv.id, p_dia: S.dia })) || []; } catch (e) { S.horas = []; aviso(e.message, 'err'); }
    pintar();
  }
  function elegir(id) {
    const s = S.servs.find(x => +x.id === +id); if (!s) return false;
    S.serv = s; S.dia = null; S.hora = null; S.horas = []; S.listo = null; S.desde = hoy(); cargarDias();
    const p = raiz.closest('section') || raiz; p.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    return true;
  }
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  /* Empareja el nombre de un tratamiento de la carta con uno de la base por sus primeras letras (limpiezas ↔ limpieza, masajes ↔ masaje) */
  function buscar(nombre) {
    const n = norm(nombre), k = n.slice(0, 6);
    return S.servs.find(x => norm(x.nombre) === n) || S.servs.find(x => k.length >= 4 && norm(x.nombre).startsWith(k)) || null;
  }
  function elegirPorNombre(nombre) { const s = buscar(nombre); return s ? elegir(s.id) : false; }

  function pintar() {
    if (S.listo) { raiz.innerHTML = listoHtml(); enlazarListo(); return; }
    const porCat = {}; S.servs.forEach(s => (porCat[s.categoria || 'General'] = porCat[s.categoria || 'General'] || []).push(s));
    const paso = (n, tit, sub, cuerpo, apagado) => `<div class="ci-paso${apagado ? ' apagado' : ''}" ${apagado ? 'aria-disabled="true"' : ''}><h3><span class="n">${n}</span>${esc(tit)}</h3><p>${esc(sub)}</p>${cuerpo}</div>`;
    const servs = S.servs.length ? Object.entries(porCat).map(([c, l]) => `<div class="ci-cat">${esc(c)}</div><div class="ci-servs">${l.map(s => `<button type="button" class="ci-serv" data-s="${s.id}" aria-pressed="${S.serv && +S.serv.id === +s.id}"><b>${esc(s.nombre)}</b>${s.descripcion ? `<span>${esc(s.descripcion)}</span>` : ''}<span class="meta"><span>${s.duracion_min} min</span><span>${esc(plata(s.precio))}</span></span></button>`).join('')}</div>`).join('') : '<p class="ci-vacio">Los tratamientos se están cargando…</p>';
    let dias = '';
    if (S.serv) {
      const hay = S.dias.some(d => d.libres > 0);
      dias = S.cargando ? '<p class="ci-vacio">Buscando espacios…</p>' : `<div class="ci-navdias"><button type="button" class="ci-enlace" id="d-ant" ${S.desde <= hoy() ? 'disabled' : ''}>← Antes</button><span>${S.dias[0] ? esc(mesCorto(S.dias[0].dia)) : ''}</span><button type="button" class="ci-enlace" id="d-sig">Más días →</button></div>
        <div class="ci-dias" role="group" aria-label="Días">${S.dias.map(d => `<button type="button" class="ci-dia" data-d="${d.dia}" aria-pressed="${S.dia === d.dia}" ${d.libres ? '' : 'disabled'} aria-label="${esc(diaLargo(d.dia))}${d.libres ? '' : ', sin espacio'}"><span>${esc(dowCorto(d.dia))}</span><b>${diaNum(d.dia)}</b><small>${d.libres ? d.libres + (d.libres === 1 ? ' hora' : ' horas') : 'sin cupo'}</small></button>`).join('')}</div>${hay ? '' : `<p class="ci-vacio">${esc(T.sin_dias)}</p>`}`;
    }
    const horas = S.dia ? (S.horas.some(h => h.libre) ? `<div class="ci-horas" role="group" aria-label="Horas">${S.horas.map(h => `<button type="button" class="ci-hora" data-h="${h.hora}" aria-pressed="${S.hora === h.hora}" ${h.libre ? '' : 'disabled'}>${h.hora}</button>`).join('')}</div>` : '<p class="ci-vacio">Ese día ya no tiene espacio. Elige otro.</p>') : '';
    const datos = S.hora ? `<div class="ci-resumen"><small>Tu cita</small><b>${esc(S.serv.nombre)}</b>${esc(diaLargo(S.dia))} · ${esc(S.hora)} · ${S.serv.duracion_min} min</div>
      <form id="f-res" novalidate><label class="ci-campo">Nombre y apellido<input name="nombre" autocomplete="name" required maxlength="80"></label>
      <label class="ci-campo">Celular<input name="tel" inputmode="tel" autocomplete="tel" placeholder="09XXXXXXXX" required maxlength="14"><small>Te escribimos a este número para confirmar.</small></label>
      <p class="ci-err" id="e-res" role="alert"></p><button class="ci-btn" type="submit" id="b-res">${esc(T.boton)}</button></form>` : '';
    raiz.innerHTML = `<div class="ci-res">${paso(1, T.paso1, T.paso1_sub, servs)}${paso(2, T.paso2, T.paso2_sub, dias, !S.serv)}${paso(3, T.paso3, T.paso3_sub, horas, !S.dia)}${paso(4, T.paso4, T.paso4_sub, datos, !S.hora)}</div>`;
    raiz.querySelectorAll('.ci-serv').forEach(b => b.onclick = () => elegir(b.dataset.s));
    raiz.querySelectorAll('.ci-dia').forEach(b => b.onclick = () => { S.dia = b.dataset.d; S.hora = null; S.horas = []; pintar(); cargarHoras(); });
    raiz.querySelectorAll('.ci-hora').forEach(b => b.onclick = () => { S.hora = b.dataset.h; pintar(); const f = document.getElementById('f-res'); if (f) f.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    const a = document.getElementById('d-ant'), sg = document.getElementById('d-sig');
    if (a) a.onclick = () => { S.desde = sumaDias(S.desde, -PAG) < hoy() ? hoy() : sumaDias(S.desde, -PAG); cargarDias(); };
    if (sg) sg.onclick = () => { S.desde = sumaDias(S.desde, PAG); cargarDias(); };
    const f = document.getElementById('f-res'); if (f) f.onsubmit = enviar;
  }

  async function enviar(ev) {
    ev.preventDefault();
    const f = ev.target, nombre = f.nombre.value.trim(), tel = f.tel.value.trim(), err = document.getElementById('e-res');
    err.textContent = '';
    if (nombre.length < 2) { err.textContent = 'Escribe tu nombre y apellido.'; return; }
    if (!/^(09\d{8}|593\d{9}|\+593\d{9})$/.test(tel.replace(/[\s-]/g, ''))) { err.textContent = 'Escribe un celular válido, por ejemplo 0991234567.'; return; }
    const b = document.getElementById('b-res'); b.disabled = true;
    try {
      const r = await rpc('agendar', { p_nombre: nombre, p_telefono: tel.replace(/[\s-]/g, ''), p_servicio: S.serv.id, p_dia: S.dia, p_hora: S.hora });
      CITAS.evento('cita_solicitada', { servicio: S.serv.nombre });
      S.listo = { nombre, servicio: S.serv.nombre, dia: S.dia, hora: S.hora, cita: r && r.cita }; pintar();
    } catch (e) { err.textContent = e.message || 'No se pudo guardar la cita.'; b.disabled = false; if (/llen|disponible|anticipaci/i.test(e.message)) { cargarHoras(); } }
  }

  function listoHtml() {
    const L = S.listo, v = { nombre: window.CU.primer(L.nombre), servicio: L.servicio, dia: diaLargo(L.dia), hora: L.hora };
    return `<div class="ci-paso"><div class="ci-listo"><svg class="ci-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 15-17"/></svg>
      <h3 style="margin:0">${esc(llenar(T.listo_titulo, v))}</h3><p>${esc(llenar(T.listo_txt, v))}</p>
      <div class="ci-resumen" style="width:100%;text-align:left"><small>Tu cita</small><b>${esc(L.servicio)}</b>${esc(v.dia)} · ${esc(L.hora)}</div>
      <a class="ci-btn" id="ci-wa" href="${esc(window.CU.wa(llenar(T.wa_cita, v), wa_num, 'cita_lista'))}" target="_blank" rel="noopener">${esc(T.wa_boton)}</a>
      <button type="button" class="ci-enlace" id="ci-otra">${esc(T.otra)}</button></div></div>`;
  }
  function enlazarListo() { document.getElementById('ci-otra').onclick = () => { S.listo = null; S.serv = null; S.dia = null; S.hora = null; S.dias = []; pintar(); }; }

  async function iniciar(sel, opt) {
    raiz = document.querySelector(sel); if (!raiz) return; wa_num = (opt || {}).wa; wa = (opt || {}).wa;
    raiz.innerHTML = '<p class="ci-vacio">Cargando…</p>';
    await cargarServicios(); pintar();
    window.dispatchEvent(new Event('reserva-lista'));
  }
  window.Reserva = { iniciar, elegir, elegirPorNombre, buscar, servicios: () => S.servs };
})();
