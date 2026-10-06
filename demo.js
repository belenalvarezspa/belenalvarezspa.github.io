/* demo.js compartido · franja de demo con el botón "Sugerir un cambio" DENTRO de la franja (el flotante tapaba el titular en móvil).
   Las sugerencias llegan al WhatsApp de la agencia (config.js → waAgencia). Colores por variables --fx-*. En impresión se oculta. */
(() => {
  const D = window.DEMO; if (!D) return;
  const pagina = document.body.dataset.pagina || 'página';
  let secciones = []; try { secciones = JSON.parse(document.body.dataset.secciones || '[]'); } catch (e) {}
  const f = document.createElement('div');
  f.className = 'franja-demo'; f.setAttribute('role', 'note');
  f.innerHTML = `<span>Demo para ${D.cliente}<span class="demo-largo">. Lo marcado [CONFIRMAR] se completa con ustedes</span></span>`;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'demo-sug'; b.textContent = 'Sugerir un cambio';
  f.append(b); document.body.prepend(f);
  const dlg = document.createElement('dialog'); dlg.className = 'demo-dlg';
  dlg.innerHTML = `<form method="dialog">
    <h2>¿Qué cambiarías?</h2>
    <label>Sección<select id="sug-sec">${(secciones.length ? secciones : ['General']).map(s => `<option>${s}</option>`).join('')}</select></label>
    <label>Tu sugerencia<textarea id="sug-txt" rows="4" required placeholder="Ej.: cambiar la foto del inicio por la del local"></textarea></label>
    <p class="demo-err" role="alert"></p>
    <div class="demo-acc"><button value="cancel" formnovalidate>Cancelar</button><button id="sug-env" value="ok">Enviar por WhatsApp</button></div>
  </form>`;
  document.body.append(dlg);
  b.onclick = () => dlg.showModal();
  dlg.querySelector('#sug-env').onclick = e => {
    const t = dlg.querySelector('#sug-txt').value.trim();
    if (!t) { e.preventDefault(); dlg.querySelector('.demo-err').textContent = 'Escribe tu sugerencia antes de enviarla.'; return; }
    const msg = `Sugerencia para la demo de ${D.cliente} · ${pagina} · ${dlg.querySelector('#sug-sec').value}: ${t}`;
    window.open(`https://wa.me/${D.waAgencia}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };
  const css = document.createElement('style');
  css.textContent = `.franja-demo{background:var(--fx-marca-bg,#fff3c4);color:var(--fx-marca-ink,#5a3b00);font:600 .9rem/1.35 system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;text-align:center;padding:6px 14px}
  @media (max-width:640px){.demo-largo{display:none}.franja-demo{flex-wrap:nowrap;justify-content:space-between;text-align:left}}
  .demo-sug{min-height:44px;flex-shrink:0;padding:0 14px;border:1.5px solid var(--fx-marca-ink,#5a3b00);border-radius:999px;background:transparent;color:var(--fx-marca-ink,#5a3b00);font:700 .9rem system-ui,sans-serif;cursor:pointer}
  .demo-dlg{border:0;border-radius:16px;padding:22px;width:min(420px,100% - 32px);font:400 1rem/1.4 system-ui,sans-serif}
  .demo-dlg::backdrop{background:rgba(0,0,0,.5)} .demo-dlg h2{margin:0 0 12px;font-size:1.25rem}
  .demo-dlg label{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;font-weight:600}
  .demo-dlg select,.demo-dlg textarea{font:inherit;padding:10px;border:1px solid #bbb;border-radius:8px}
  .demo-acc{display:flex;gap:10px;justify-content:flex-end}.demo-acc button{min-height:44px;padding:0 16px;border-radius:8px;border:1px solid #333;background:#fff;font:600 1rem system-ui;cursor:pointer}
  .demo-acc #sug-env{background:var(--fx-deep,#222);color:var(--fx-bg,#fff)}.demo-err{color:var(--fx-error,#8a1c1c);min-height:1em;margin:0 0 8px}
  @media print{.franja-demo,.demo-sug{display:none}}`;
  document.head.append(css);
})();
