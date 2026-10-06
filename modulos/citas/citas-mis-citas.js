/* citas-mis-citas.js · "Mis citas": la clienta entra con su código (llega por WhatsApp al confirmar) y los últimos 4 dígitos de su celular.
   Ve sus citas próximas y puede cancelar (hasta 6 h antes). Su sesión es un token aparte: el QR (si algún día hay tarjeta de sellos) nunca abre esta pantalla. */
(() => {
  const { esc, diaLargo, aviso, accion, chip, primer } = window.CU;
  const cont = document.getElementById('mc');
  const T = (window.CITASDATA || {}).textos || {};
  const WA = (window.DEMO || {}).waCliente;

  function entrada(msg) {
    const ej = CITAS.ejemplo(), p = new URLSearchParams(location.search);
    cont.innerHTML = `<div class="ci-entrada"><div class="ci-card"><h3>Entra a tus citas</h3>
      <form id="f-in" novalidate><label class="ci-campo">Tu código<input name="codigo" autocomplete="off" autocapitalize="characters" placeholder="BA-XXXXXX" maxlength="20" value="${esc(p.get('c') || '')}"><small>Te lo enviamos por WhatsApp cuando confirmamos tu primera cita.</small></label>
      <label class="ci-campo">Últimos 4 dígitos de tu celular<input name="u4" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="1234"></label>
      <p class="ci-err" id="e-in" role="alert">${esc(msg || '')}</p><button class="ci-btn" type="submit">Ver mis citas</button></form></div>
      ${ej ? `<div class="ci-pista"><b>Para probar la demo:</b> código <b>${esc(ej.codigo)}</b> y últimos 4 dígitos <b>${esc(ej.ultimos4)}</b>. <button type="button" class="ci-enlace" id="auto">Escribirlos por mí</button></div>` : ''}
      <p style="text-align:center">¿No tienes código? <a href="inicio.html#reservar">Reserva tu primera cita</a> o <a data-wa-mc href="#">escríbenos por WhatsApp</a>.</p></div>`;
    const f = document.getElementById('f-in');
    document.querySelector('[data-wa-mc]').href = CITAS.wa('Hola, necesito ayuda con mi cita', WA);
    const a = document.getElementById('auto'); if (a) a.onclick = () => { f.codigo.value = ej.codigo; f.u4.value = ej.ultimos4; };
    f.onsubmit = async e => {
      e.preventDefault(); const err = document.getElementById('e-in'); err.textContent = '';
      if (!f.codigo.value.trim() || !/^\d{4}$/.test(f.u4.value.trim())) { err.textContent = 'Escribe tu código y los 4 últimos dígitos.'; return; }
      const b = f.querySelector('button'); b.disabled = true;
      try { await CITAS.cliente.entrar(f.codigo.value.trim(), f.u4.value.trim()); await mostrar(); } catch (x) { err.textContent = x.message; b.disabled = false; }
    };
  }

  async function mostrar() {
    let t;
    try { t = await CITAS.rpc('tarjeta', { p_token: CITAS.cliente.token() }); } catch (e) { CITAS.cliente.salir(); return entrada('Tu sesión venció. Entra otra vez.'); }
    const cs = t.citas || [];
    cont.innerHTML = `<div class="ci-app"><div class="ci-card"><h3>Hola, ${esc(primer(t.nombre))}</h3><p>Tu código: <span class="ci-codigo">${esc(t.codigo)}</span></p>
      <p><a class="ci-btn" href="inicio.html#reservar">Reservar otra cita</a> <button type="button" class="ci-btn linea" id="salir">Salir</button></p></div>
      <div class="ci-card"><h3>Tus próximas citas</h3>${cs.length ? cs.map(c => `<div class="ci-fila"><div><b>${esc(c.servicio)}</b><small>${esc(diaLargo(c.dia))} · ${esc(c.hora)}–${esc(c.hora_fin)}</small></div>
        <div class="der">${chip(c.estado)}${c.cancelable ? `<button type="button" class="ci-btn rojo peq" data-c="${c.id}">Cancelar</button>` : `<a class="ci-btn linea peq" data-wa-c="${esc(c.servicio)}" href="#">Cambiar por WhatsApp</a>`}</div></div>`).join('') : '<p class="ci-vacio">No tienes citas por atender. ¡Reserva una!</p>'}
      <p style="margin-top:12px;opacity:.75;font-size:.92rem">Puedes cancelar hasta 6 horas antes. Después, escríbenos por WhatsApp.</p></div></div>`;
    document.getElementById('salir').onclick = () => { CITAS.cliente.salir(); entrada(); };
    cont.querySelectorAll('[data-wa-c]').forEach(a => a.href = CITAS.wa(`Hola, necesito cambiar mi cita de ${a.dataset.waC} (código ${t.codigo})`, WA));
    cont.querySelectorAll('[data-c]').forEach(b => b.onclick = async () => {
      if (!confirm('¿Cancelar esta cita?')) return;
      const r = await accion(b, () => CITAS.rpc('cancelar', { p_token: CITAS.cliente.token(), p_cita: +b.dataset.c }), 'Cita cancelada');
      if (r !== undefined) mostrar();
    });
  }
  (CITAS.cliente.token() ? mostrar() : Promise.resolve(entrada()));
})();
