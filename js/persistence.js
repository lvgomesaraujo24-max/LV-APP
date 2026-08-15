import { $, S, esc } from './state.js';
import { adesao, mediaGrupo, grupoBem, evolucaoCarga, fmt1, deltaExercicio } from './derived.js';
import { stepper, renderSemanas, renderProgressao, renderHidratacao, renderPilares, renderBemEstar,
         renderLazer, renderFatores, renderDesconfortos, renderAlertas, renderMetas, dirty, sync } from './ui.js';
import { gerarPreview } from './report.js';

/* ================================================================== *
 *  PERSISTÊNCIA — histórico por aluna e por ciclo
 * ================================================================== */
export const STORE = 'consultoria_treino_v1';
export const CAMPOS = ['previstos','realizados','semanas','prog','pilares','lazer','bemestar','hidratacao',
                'fatores','desconfortos','alertas','encaminhamento','obs','metas',
                'metaProgressao','concluida','email'];

export const slug = s => (s || 'sem-nome').trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export function lerStore(){
  try { return JSON.parse(localStorage.getItem(STORE)) || { alunas:{} }; }
  catch { return { alunas:{} }; }
}
export function gravarStore(st){
  try { localStorage.setItem(STORE, JSON.stringify(st)); return true; }
  catch { return false; }
}
export const clone = o => JSON.parse(JSON.stringify(o));

/* ---- modal não-bloqueante, substitui confirm()/alert() nativos ---- */
export function modalAlert(msg){
  return new Promise(resolve => {
    $('modalMsg').textContent = msg;
    $('modalCancelar').style.display = 'none';
    $('modalOk').textContent = 'OK';
    $('modalBg').hidden = false;
    $('modalOk').onclick = () => { $('modalBg').hidden = true; resolve(); };
  });
}
export function modalConfirm(msg){
  return new Promise(resolve => {
    $('modalMsg').textContent = msg;
    $('modalCancelar').style.display = '';
    $('modalOk').textContent = 'Confirmar';
    $('modalBg').hidden = false;
    const fechar = v => { $('modalBg').hidden = true; resolve(v); };
    $('modalOk').onclick = () => fechar(true);
    $('modalCancelar').onclick = () => fechar(false);
  });
}

export function snapshot(){
  const snap = { nome:S.aluna, mes:S.mes, salvoEm:new Date().toISOString() };
  CAMPOS.forEach(k => snap[k] = clone(S[k]));
  return snap;
}

let saveTimer = null;
export function salvar(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const st = lerStore();
    const k = slug(S.aluna);
    st.alunas[k] = st.alunas[k] || { nome:S.aluna, ciclos:{} };
    st.alunas[k].nome = S.aluna;
    st.alunas[k].ciclos[S.mes] = snapshot();
    const ok = gravarStore(st);
    const h = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    $('saveStatus').textContent = ok ? `salvo às ${h}` : 'não foi possível salvar neste navegador';
    renderCiclos();
  }, 500);
}

/** ciclo imediatamente anterior a S.mes, da mesma aluna */
export function cicloAnterior(){
  const a = lerStore().alunas[slug(S.aluna)];
  if (!a) return null;
  const antes = Object.keys(a.ciclos).filter(m => m < S.mes).sort();
  return antes.length ? a.ciclos[antes[antes.length - 1]] : null;
}

/* --- métricas comparáveis entre ciclos --- */
export function metricas(snap){
  const prev = snap.previstos, real = snap.realizados;
  const md = g => {
    const ns = g.itens.flatMap(f => f.notas).map(Number).filter(n => n > 0);
    return ns.length ? ns.reduce((a,b)=>a+b,0)/ns.length : null;
  };
  const gd = snap.bemestar.find(g => g.id === 'disposicao');
  const gr = snap.bemestar.find(g => g.id === 'recuperacao');
  const exs = Object.values(snap.prog.grupos).flatMap(g => g.exercicios);
  const ds = exs.map(deltaExercicio).filter(x => x !== null);
  return {
    adesao: prev > 0 ? Math.round(real / prev * 100) : 0,
    disposicao: gd ? md(gd) : null,
    recuperacao: gr ? md(gr) : null,
    carga: ds.length ? Math.round(ds.reduce((a,b)=>a+b,0)/ds.length) : null
  };
}
export function metricasAtuais(){
  return {
    adesao: adesao(),
    disposicao: mediaGrupo(grupoBem('disposicao')),
    recuperacao: mediaGrupo(grupoBem('recuperacao')),
    carga: evolucaoCarga()
  };
}
export const mesCurto = m => {
  const n = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return n[+m.split('-')[1] - 1] || m;
};

export function renderComparacao(){
  const ant = cicloAnterior();
  const alvos = { adesao:'cmpAdesao', disposicao:'cmpDisposicao', recuperacao:'cmpRecuperacao', carga:'cmpCarga' };
  if (!ant){
    Object.values(alvos).forEach(id => {
      $(id).className = 'cmp none';
      $(id).textContent = 'sem ciclo anterior para comparar';
    });
    return;
  }
  const a = metricas(ant), b = metricasAtuais();
  const uni = { adesao:'pp', disposicao:'pts', recuperacao:'pts', carga:'pp' };
  Object.entries(alvos).forEach(([k,id]) => {
    const el = $(id);
    if (a[k] === null || b[k] === null){
      el.className = 'cmp none'; el.textContent = `sem base em ${mesCurto(ant.mes)}`; return;
    }
    const d = Math.round((b[k] - a[k]) * 10) / 10;
    const cor = d > 0 ? 'var(--baixa)' : d < 0 ? 'var(--alta)' : 'var(--s400)';
    el.className = 'cmp';
    el.innerHTML = `<span style="color:${cor}">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${d > 0 ? '+' : ''}${fmt1(d)} ${uni[k]}</span>
      <span style="color:var(--s400);font-weight:500">vs ${mesCurto(ant.mes)}</span>`;
  });
}

export function renderCiclos(){
  const st = lerStore();
  const opts = [];
  Object.entries(st.alunas).forEach(([k,a]) =>
    Object.keys(a.ciclos).sort().reverse().forEach(m =>
      opts.push({ v:`${k}|${m}`, t:`${a.nome} — ${mesCurto(m)}/${m.split('-')[0]}` })));
  const atual = `${slug(S.aluna)}|${S.mes}`;
  $('ciclosSel').innerHTML = opts.length
    ? opts.map(o => `<option value="${o.v}" ${o.v===atual?'selected':''}>${esc(o.t)}</option>`).join('')
    : '<option>nenhum ciclo salvo</option>';
}

/** aplica um snapshot ao estado e redesenha tudo */
export function aplicar(snap){
  S.aluna = snap.nome; S.mes = snap.mes;
  CAMPOS.forEach(k => { if (snap[k] !== undefined) S[k] = clone(snap[k]); });
  $('aluna').value = S.aluna; $('mes').value = S.mes;
  $('obs').value = S.obs || ''; $('encaminhamento').value = S.encaminhamento || '';
  $('mailPara').value = S.email || '';
  renderTudo(); gerarPreview();
}

/** tenta carregar o ciclo da combinação aluna+mês atual */
export function carregarAtual(){
  const a = lerStore().alunas[slug(S.aluna)];
  const snap = a && a.ciclos[S.mes];
  if (snap) aplicar(snap); else { renderTudo(); gerarPreview(); salvar(); }
}

export function renderTudo(){
  stepper($('stPrevistos'),  () => S.previstos,  v => S.previstos = v,  { max:40 });
  stepper($('stRealizados'), () => S.realizados, v => S.realizados = v, { max:40 });
  renderSemanas(); renderProgressao(); renderHidratacao(); renderPilares();
  renderBemEstar(); renderLazer(); renderFatores(); renderDesconfortos();
  renderAlertas(); renderMetas(); renderCiclos();
  dirty.bem = dirty.carga = dirty.freq = dirty.pilares = true;
  sync();
}

