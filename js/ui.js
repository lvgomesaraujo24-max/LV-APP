import { $, S, uid, svg, esc, IMPACTOS, CONDUTAS, ALERTAS, TEMPLATES, CATEGORIAS, PRIORIDADES,
         STATUS, grupoAtivo, todosExercicios, labelSessao } from './state.js';
import { deltaExercicio, mediaDelta, extremosCarga, evolucaoCarga, corNota, media, mediaSemana,
         mediaGrupo, grupoBem, fmt1, adesao, badge, progressoPlano, iniciais, mesLabel } from './derived.js';
import { renderComparacao, salvar } from './persistence.js';

/* ================================================================== *
 *  COMPONENTES REUTILIZÁVEIS
 * ================================================================== */
export function stepper(host, get, set, { min=0, max=99, suffix='' } = {}){
  host.innerHTML = `<span class="stepper">
    <button data-a="-" aria-label="Diminuir">‹</button>
    <input type="number" value="${get()}" />
    ${suffix ? `<span class="suf">${suffix}</span>` : ''}
    <button data-a="+" aria-label="Aumentar">›</button>
  </span>`;
  const inp = host.querySelector('input');
  const clamp = n => Math.max(min, Math.min(max, n));
  host.querySelectorAll('button').forEach(b => b.onclick = () => {
    const v = clamp(get() + (b.dataset.a === '+' ? 1 : -1));
    set(v); inp.value = v; sync();
  });
  inp.oninput = () => { set(clamp(+inp.value || 0)); sync(); };
}

/* ================================================================== *
 *  GRÁFICOS
 * ================================================================== */
Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
Chart.defaults.font.size = 11;
Chart.defaults.color = '#9A938B';
const GRID = { color:'#EDEAE6', drawTicks:false };
const LEGEND = { position:'bottom', labels:{ usePointStyle:true, pointStyle:'circle', boxWidth:7, padding:16 } };

export const chartFreq = new Chart($('chartFreq'), {
  type:'bar',
  data:{ labels:S.semanas.map(s=>s.nome), datasets:[
    { label:'Previsto', data:S.semanas.map(s=>s.previsto), backgroundColor:'#E5E1DC', borderRadius:6, maxBarThickness:34 },
    { label:'Realizado', data:S.semanas.map(s=>s.realizado), backgroundColor:'#E8B4B8', borderRadius:6, maxBarThickness:34 }
  ]},
  options:{ maintainAspectRatio:false, plugins:{ legend:LEGEND },
    scales:{ x:{ grid:{ display:false }, border:{ display:false } },
             y:{ beginAtZero:true, ticks:{ precision:0 }, grid:GRID, border:{ display:false } } } }
});

export const chartCarga = new Chart($('chartCarga'), {
  type:'line',
  data:{ labels:[], datasets:[] },
  options:{ maintainAspectRatio:false, plugins:{ legend:LEGEND,
      tooltip:{ callbacks:{ label: c => ' ' + c.dataset.label + ': ' + c.raw + ' kg' } } },
    scales:{ x:{ grid:{ display:false }, border:{ display:false } },
             y:{ grid:GRID, border:{ display:false }, ticks:{ callback:v => v + ' kg' } } } }
});

export const chartBem = new Chart($('chartBem'), {
  type:'line',
  data:{ labels:[], datasets:[] },
  options:{ maintainAspectRatio:false,
    plugins:{ legend:LEGEND, tooltip:{ callbacks:{ label: c => ' ' + c.dataset.label + ': ' + fmt1(c.raw) + '/10' } } },
    scales:{ x:{ grid:{ display:false }, border:{ display:false } },
             y:{ min:0, max:10, ticks:{ stepSize:2 }, grid:GRID, border:{ display:false } } } }
});

export const chartPilares = new Chart($('chartPilares'), {
  type:'doughnut',
  data:{ labels:S.pilares.map(p=>p.nome), datasets:[{
    data:S.pilares.map(p=>p.valor), backgroundColor:S.pilares.map(p=>p.cor),
    borderWidth:0, spacing:4, cutout:'62%'
  }]},
  options:{ maintainAspectRatio:false, plugins:{ legend:{ display:false },
    tooltip:{ callbacks:{ label: c => ' ' + c.label + ': ' + c.raw + '%' } } } }
});

/* ================================================================== *
 *  RENDER — blocos estáticos
 * ================================================================== */
export function renderSemanas(){
  $('semanaCtrls').innerHTML = S.semanas.map((s,i) =>
    `<div style="border:1px solid var(--s200);background:rgba(250,250,249,.5);border-radius:12px;padding:11px">
       <p class="label" style="margin-bottom:8px">${s.nome}</p><span id="stSem${i}"></span></div>`).join('');
  S.semanas.forEach((s,i) => stepper($('stSem' + i),
    () => S.semanas[i].realizado, v => { S.semanas[i].realizado = v; dirty.freq = true; }, { max:14, suffix:'/' + s.previsto }));
}

export function renderProgressao(){
  const P = S.prog;

  /* --- abas Inferiores / Superiores --- */
  $('grupoTabs').innerHTML = Object.entries(P.grupos).map(([k,g]) =>
    `<button data-g="${k}" class="${P.ativo===k?'on':''}">${g.label}
       <span class="cnt">${g.exercicios.length}</span></button>`).join('');
  $('grupoTabs').querySelectorAll('button').forEach(b => b.onclick = () => {
    P.ativo = b.dataset.g; renderProgressao(); dirty.carga = true; sync();
  });

  /* --- tabela: colunas = sessões datadas --- */
  const g = grupoAtivo();
  $('tabCarga').innerHTML = `
    <thead><tr><th>Exercício</th>
      ${P.sessoes.map((s,i) => `<th><span class="col">
        <input class="date-in" type="date" data-s="${i}" value="${s.data}"/>
        <button class="colx" data-delcol="${i}" title="Remover sessão">✕</button>
      </span></th>`).join('')}
      <th style="min-width:52px">Δ</th></tr></thead>
    <tbody>${g.exercicios.map((e,ei) => {
      const d = deltaExercicio(e);
      return `<tr class="ex-row">
        <td><span class="dot" style="background:${e.cor}"></span>
          <input class="ex-name" data-ex="${ei}" value="${esc(e.nome)}" placeholder="Nome do exercício"/>
          <button class="del" data-delex="${ei}" title="Remover exercício">${svg('trash',13)}</button></td>
        ${P.sessoes.map((s,si) => `<td><input class="cell-in" type="number" step="0.5"
            data-ex="${ei}" data-s="${si}" value="${e.cargas[si] ?? ''}" placeholder="—"/></td>`).join('')}
        <td><span class="delta" style="color:${d === null ? 'var(--s300)' : d > 0 ? 'var(--baixa)' : d < 0 ? 'var(--alta)' : 'var(--s400)'}">
          ${d === null ? '—' : (d > 0 ? '+' : '') + d + '%'}</span></td>
      </tr>`;
    }).join('')}
    ${g.exercicios.length ? '' : `<tr><td colspan="${P.sessoes.length+2}" style="text-align:center;padding:16px;color:var(--s400);font-size:12px">
      Nenhum exercício neste grupo — adicione o primeiro abaixo.</td></tr>`}</tbody>`;

  /* datas */
  $('tabCarga').querySelectorAll('.date-in').forEach(inp => inp.onchange = () => {
    P.sessoes[+inp.dataset.s].data = inp.value; dirty.carga = true; sync();
  });
  /* remover sessão (coluna) */
  $('tabCarga').querySelectorAll('[data-delcol]').forEach(b => b.onclick = () => {
    if (P.sessoes.length <= 2) return;
    const i = +b.dataset.delcol;
    P.sessoes.splice(i, 1);
    Object.values(P.grupos).forEach(gr => gr.exercicios.forEach(e => e.cargas.splice(i, 1)));
    renderProgressao(); dirty.carga = true; sync();
  });
  /* nome do exercício — sem re-render, preserva o cursor */
  $('tabCarga').querySelectorAll('.ex-name').forEach(inp => inp.oninput = () => {
    g.exercicios[+inp.dataset.ex].nome = inp.value; dirty.carga = true; sync();
  });
  /* remover exercício */
  $('tabCarga').querySelectorAll('[data-delex]').forEach(b => b.onclick = () => {
    g.exercicios.splice(+b.dataset.delex, 1); renderProgressao(); dirty.carga = true; sync();
  });
  /* cargas */
  $('tabCarga').querySelectorAll('.cell-in').forEach(inp => inp.oninput = () => {
    const e = g.exercicios[+inp.dataset.ex];
    e.cargas[+inp.dataset.s] = inp.value === '' ? null : (+inp.value || 0);
    const row = inp.closest('tr').querySelector('.delta');
    const d = deltaExercicio(e);
    row.textContent = d === null ? '—' : (d > 0 ? '+' : '') + d + '%';
    row.style.color = d === null ? 'var(--s300)' : d > 0 ? 'var(--baixa)' : d < 0 ? 'var(--alta)' : 'var(--s400)';
    dirty.carga = true; sync();
  });

  $('addExercicio').innerHTML = svg('plus',12,2.5) + ' Exercício em ' + g.label.toLowerCase();
  $('addSessao').innerHTML    = svg('plus',12,2.5) + ' Nova data';
  $('progHint').textContent   = `${P.sessoes.length} sessões · ${todosExercicios().length} exercícios no total`;
}

/* ---- análise: por grupo, extremos e meta do ciclo ---- */
export function renderAnalise(){
  const inf = mediaDelta(S.prog.grupos.inferiores.exercicios);
  const sup = mediaDelta(S.prog.grupos.superiores.exercicios);
  const ex  = extremosCarga();
  const geral = evolucaoCarga();
  const meta = Number(S.metaProgressao) || 0;
  const atingido = meta > 0 ? Math.max(0, Math.min(100, Math.round(geral / meta * 100))) : 0;
  const cor = v => v === null ? 'var(--s400)' : v > 0 ? 'var(--baixa)' : v < 0 ? 'var(--alta)' : 'var(--s500)';
  const pct = v => v === null ? '—' : (v > 0 ? '+' : '') + v + '%';

  $('analiseCarga').innerHTML = `
    <div class="an">
      <span class="t">Por grupo muscular</span>
      <div class="lin"><span><span class="dot" style="background:#E8B4B8"></span>Inferiores</span>
        <b style="color:${cor(inf)}">${pct(inf)}</b></div>
      <div class="lin" style="margin:0"><span><span class="dot" style="background:#DCC7AA"></span>Superiores</span>
        <b style="color:${cor(sup)}">${pct(sup)}</b></div>
    </div>

    <div class="an">
      <span class="t">Destaque e atenção</span>
      ${ex ? `
        <div style="margin-bottom:10px">
          <span class="tiny" style="color:var(--baixa);font-weight:700">▲ MAIOR EVOLUÇÃO</span>
          <span class="nm">${esc(ex.melhor.nome)} <b style="color:var(--baixa)">${pct(ex.melhor.d)}</b></span>
        </div>
        <div>
          <span class="tiny" style="color:${ex.pior.d < 0 ? 'var(--alta)' : 'var(--media)'};font-weight:700">▼ MENOR EVOLUÇÃO</span>
          <span class="nm">${esc(ex.pior.nome)} <b style="color:${cor(ex.pior.d)}">${pct(ex.pior.d)}</b></span>
        </div>`
      : '<p class="tiny muted">Registre ao menos duas sessões para comparar.</p>'}
    </div>

    <div class="an">
      <span class="t">Meta de progressão do ciclo</span>
      <div class="row" style="justify-content:space-between;margin-bottom:9px">
        <span class="row" style="gap:6px"><span class="tiny muted">alvo</span>
          <input class="meta-in" type="number" id="inMeta" min="0" max="100" value="${meta}"/>
          <span class="tiny muted">%</span></span>
        <span class="big" style="color:${atingido >= 100 ? 'var(--baixa)' : 'var(--s800)'}">${atingido}%</span>
      </div>
      <div class="bar"><i style="background:${atingido >= 100 ? 'var(--baixa)' : 'var(--sand)'};width:${Math.min(atingido,100)}%"></i></div>
      <p class="tiny muted" style="margin-top:7px">${pct(geral)} alcançados de ${meta}% planejados</p>
    </div>`;

  /* atualiza só o indicador, sem re-render — preserva o foco no campo */
  $('inMeta').oninput = e => {
    S.metaProgressao = +e.target.value || 0;
    const m = S.metaProgressao;
    const at = m > 0 ? Math.max(0, Math.min(100, Math.round(evolucaoCarga() / m * 100))) : 0;
    const box = e.target.closest('.an');
    const big = box.querySelector('.big');
    big.textContent = at + '%';
    big.style.color = at >= 100 ? 'var(--baixa)' : 'var(--s800)';
    const b = box.querySelector('.bar i');
    b.style.width = Math.min(at,100) + '%';
    b.style.background = at >= 100 ? 'var(--baixa)' : 'var(--sand)';
    box.querySelector('.tiny.muted').textContent = pct(evolucaoCarga()) + ` alcançados de ${m}% planejados`;
  };
}

/* ---- bem-estar: tabela editável ---- */
export function renderBemEstar(){
  const sem = S.semanas;
  const head = `<thead><tr><th style="min-width:150px">Sub-fator</th>
    ${sem.map(s => `<th>${s.nome.replace('Semana ','S')}</th>`).join('')}
    <th style="min-width:52px">Média</th></tr></thead>`;

  const body = S.bemestar.map((g,gi) => `
    <tr class="grp-row"><td colspan="${sem.length + 1}">
        <span class="dot" style="background:${g.cor}"></span>${g.label}</td>
      <td style="text-align:right"><button class="addfat" data-addfat="${gi}">+ fator</button></td></tr>
    ${g.itens.map((f,fi) => `<tr class="ex-row">
      <td><input class="ex-name" data-g="${gi}" data-f="${fi}" value="${esc(f.label)}" placeholder="Nome do fator"/>
        <button class="del" data-delfat="${gi}:${fi}" title="Remover fator">${svg('trash',12)}</button></td>
      ${sem.map((_,si) => {
        const v = f.notas[si];
        return `<td><input class="note-in" type="number" min="1" max="10" placeholder="—"
          data-g="${gi}" data-f="${fi}" data-s="${si}" value="${v ?? ''}"
          style="color:${corNota(v)}"/></td>`;
      }).join('')}
      <td><span class="media-cell" style="color:${corNota(media(f.notas))}">${fmt1(media(f.notas))}</span></td>
    </tr>`).join('')}`).join('');

  $('tabBem').innerHTML = head + '<tbody>' + body + '</tbody>';

  $('tabBem').querySelectorAll('.note-in').forEach(inp => inp.oninput = () => {
    const v = inp.value === '' ? null : Math.max(1, Math.min(10, +inp.value || 0));
    S.bemestar[+inp.dataset.g].itens[+inp.dataset.f].notas[+inp.dataset.s] = v;
    inp.style.color = corNota(v);
    const cel = inp.closest('tr').querySelector('.media-cell');
    const m = media(S.bemestar[+inp.dataset.g].itens[+inp.dataset.f].notas);
    cel.textContent = fmt1(m); cel.style.color = corNota(m);
    dirty.bem = true; sync();
  });
  $('tabBem').querySelectorAll('.ex-name').forEach(inp => inp.oninput = () => {
    S.bemestar[+inp.dataset.g].itens[+inp.dataset.f].label = inp.value; dirty.bem = true; sync();
  });
  $('tabBem').querySelectorAll('[data-addfat]').forEach(b => b.onclick = () => {
    S.bemestar[+b.dataset.addfat].itens.push({ id:uid(), label:'', notas:S.semanas.map(()=>null) });
    renderBemEstar(); dirty.bem = true; sync();
    const ns = $('tabBem').querySelectorAll('.ex-name');
    [...ns].reverse().find(i => !i.value)?.focus();
  });
  $('tabBem').querySelectorAll('[data-delfat]').forEach(b => b.onclick = () => {
    const [gi,fi] = b.dataset.delfat.split(':').map(Number);
    if (S.bemestar[gi].itens.length <= 1) return;
    S.bemestar[gi].itens.splice(fi,1); renderBemEstar(); dirty.bem = true; sync();
  });
}

/* ================================================================== *
 *  HIDRATAÇÃO
 * ================================================================== */
/** média de litros/dia no ciclo, ignorando semanas em branco */
export function mediaAgua(){
  const v = S.hidratacao.semanas.map(Number).filter(n => n > 0);
  return v.length ? v.reduce((a,b)=>a+b,0) / v.length : null;
}
/** score = consumo médio ÷ meta, em % (pode passar de 100) */
export function scoreHidratacao(){
  const m = mediaAgua(), meta = Number(S.hidratacao.meta) || 0;
  if (m === null || meta <= 0) return null;
  return Math.round(m / meta * 100);
}
export function classeHidratacao(s){
  if (s === null) return { txt:'sem registro', cor:'var(--s500)', bg:'var(--s100)' };
  if (s >= 95) return { txt:'Excelente', cor:'#7C9A82', bg:'rgba(124,154,130,.14)' };
  if (s >= 80) return { txt:'Boa',       cor:'#B99150', bg:'rgba(185,145,80,.14)'  };
  if (s >= 60) return { txt:'Atenção',   cor:'#C87A7A', bg:'rgba(232,180,184,.2)'  };
  return          { txt:'Baixa',    cor:'#C87A7A', bg:'rgba(200,122,122,.14)' };
}
/** referência usual de 35 ml por kg de peso */
export const metaPorPeso = kg => Math.round(kg * 35 / 100) / 10;

export function renderHidratacao(){
  const H = S.hidratacao;
  $('hidMeta').value = H.meta ?? '';
  $('hidPeso').value = H.peso ?? '';
  $('hidObs').value  = H.obs || '';

  const esc4 = v => v === null || v === undefined ? '' : v;
  $('hidSemanas').innerHTML = S.semanas.map((s,i) => {
    const v = Number(H.semanas[i]) || 0;
    const teto = (Number(H.meta) || 2) * 1.4;
    const h = Math.min(v / teto, 1) * 100;
    return `<div class="hyd">
      <div class="tk"><span class="goal"></span>
        <i style="height:${h}%;background:${v === 0 ? 'transparent' : v >= H.meta ? '#7C9A82' : v >= H.meta*0.75 ? '#B99150' : '#C87A7A'}"></i>
      </div>
      <input type="number" step="0.1" min="0" max="9" data-i="${i}" value="${esc4(H.semanas[i])}" placeholder="—"/>
      <span class="lb">${s.nome.replace('Semana ','S')}</span>
    </div>`;
  }).join('');

  $('hidSemanas').querySelectorAll('input').forEach(inp => inp.oninput = () => {
    H.semanas[+inp.dataset.i] = inp.value === '' ? null : (+inp.value || 0);
    atualizaHidratacao(); dirty.pilares = true; sync();
  });
  atualizaHidratacao();
}

/** atualiza score, barra, classificação e o pilar automático */
export function atualizaHidratacao(){
  const H = S.hidratacao;
  const sc = scoreHidratacao(), cl = classeHidratacao(sc), m = mediaAgua();

  $('hidScore').textContent = sc === null ? '—' : sc + '%';
  $('hidScore').style.color = cl.cor;
  $('hidClasse').textContent = cl.txt;
  $('hidClasse').style.background = cl.bg;
  $('hidClasse').style.color = cl.cor;
  $('hidBar').style.width = Math.min(sc ?? 0, 100) + '%';
  $('hidBar').style.background = cl.cor;
  $('hidHint').textContent = m === null ? 'sem registro no ciclo'
    : `${fmt1(m)} L/dia em média · meta de ${fmt1(Number(H.meta))} L`;
  $('hidSugestao').textContent = H.peso
    ? `Referência de 35 ml/kg: ${fmt1(metaPorPeso(H.peso))} L por dia.`
    : 'Informe o peso para calcular a referência de 35 ml/kg.';

  /* redesenha as barrinhas conforme a meta muda */
  const teto = (Number(H.meta) || 2) * 1.4;
  $('hidSemanas').querySelectorAll('.hyd').forEach((el,i) => {
    const v = Number(H.semanas[i]) || 0;
    const b = el.querySelector('i');
    b.style.height = Math.min(v / teto, 1) * 100 + '%';
    b.style.background = v === 0 ? 'transparent'
      : v >= H.meta ? '#7C9A82' : v >= H.meta * 0.75 ? '#B99150' : '#C87A7A';
  });

  /* o pilar de hidratação na rosca é alimentado pelo score */
  const p = S.pilares.find(x => x.auto);
  if (p){
    p.valor = Math.max(0, Math.min(100, sc ?? 0));
    const i = S.pilares.indexOf(p);
    if ($('pv' + i)) $('pv' + i).textContent = p.valor + '%';
  }
}

/* ---- mini barras semanais dentro dos KPIs ---- */
export function renderMini(host, grupo){
  $(host).innerHTML = S.semanas.map((s,i) => {
    const m = mediaSemana(grupo, i);
    return `<div class="mw"><div class="track">
      <i style="height:${m ? Math.round(m/10*100) : 0}%;background:${m ? grupo.cor : 'transparent'}"></i>
      </div><div class="lb">${s.nome.replace('Semana ','S')}</div></div>`;
  }).join('');
}

/** próxima data sugerida: 7 dias após a última sessão */
export function proximaData(){
  const ult = [...S.prog.sessoes].reverse().find(s => s.data);
  const base = ult ? new Date(ult.data + 'T12:00:00') : new Date();
  base.setDate(base.getDate() + 7);
  return base.toISOString().slice(0,10);
}

export function renderPilares(){
  $('pilarCtrls').innerHTML = S.pilares.map((p,i) => `<div>
      <div class="between" style="margin-bottom:7px">
        <span style="font-size:14px;font-weight:500;color:var(--s600)">
          <span class="dot" style="background:${p.cor}"></span>${p.nome}
          ${p.auto ? '<span class="tiny" style="color:var(--s400);font-weight:500;margin-left:4px">automático</span>' : ''}</span>
        <span class="num" style="font-size:14px;font-weight:600;color:var(--s800)" id="pv${i}">${p.valor}%</span>
      </div>
      ${p.auto
        ? `<div class="bar"><i style="background:${p.cor};width:${p.valor}%"></i></div>`
        : `<input type="range" min="0" max="100" step="5" value="${p.valor}" data-i="${i}"
             style="background:linear-gradient(90deg,${p.cor} ${p.valor}%,#EDEAE6 ${p.valor}%)"/>`}
    </div>`).join('');
  $('pilarCtrls').querySelectorAll('input').forEach(r => r.oninput = () => {
    const i = +r.dataset.i; S.pilares[i].valor = +r.value;
    $('pv' + i).textContent = r.value + '%';
    r.style.background = `linear-gradient(90deg,${S.pilares[i].cor} ${r.value}%,#EDEAE6 ${r.value}%)`;
    dirty.pilares = true; sync();
  });
}

export function renderLazer(){
  const cor = '#C3B5D9';
  $('lazerLista').innerHTML = S.lazer.length ? S.lazer.map(a =>
    `<div class="acao ${a.feito?'done':''}" data-id="${a.id}">
       <button class="tick" data-t style="${a.feito?`background:${cor};border-color:transparent`:''}">${svg('check',11,3)}</button>
       <input data-x value="${esc(a.texto)}" placeholder="Ex.: ler antes de dormir, ir ao parque, pintar as unhas..."/>
       <button class="del" data-d aria-label="Remover">${svg('trash',13)}</button>
     </div>`).join('')
    : '<p class="empty">Nenhum registro — pergunte o que ela fez por prazer neste mês.</p>';

  $('lazerLista').querySelectorAll('.acao').forEach(row => {
    const a = S.lazer.find(x => x.id === row.dataset.id);
    row.querySelector('[data-t]').onclick = () => { a.feito = !a.feito; renderLazer(); sync(); };
    row.querySelector('[data-d]').onclick = () => {
      S.lazer = S.lazer.filter(x => x.id !== a.id); renderLazer(); sync(); };
    row.querySelector('[data-x]').oninput = e => { a.texto = e.target.value; };
  });

  const n = S.lazer.filter(a => a.feito).length;
  $('lazerCont').textContent = `${n}/${S.lazer.length} realizados`;
  $('addLazer').innerHTML = svg('plus',12,2.5) + ' Adicionar';
}

export function renderFatores(){
  $('fatores').innerHTML = S.fatores.map((f,i) => {
    const im = IMPACTOS[f.impacto];
    return `<div class="fat ${f.ativo?'on':''}" data-i="${i}">
      <div class="top">
        <button class="box" data-tg style="${f.ativo?'background:var(--s800);border-color:transparent;color:#fff':''}">${svg('check',12,3)}</button>
        <input class="fat-name" data-nm value="${esc(f.label)}" placeholder="Nome do fator"/>
        ${f.ativo ? `<span class="pill" style="background:${im.bg};color:${im.cor}">${im.label}</span>` : ''}
        <button class="del" data-del title="Remover" style="opacity:.45">${svg('trash',12)}</button>
      </div>
      ${f.ativo ? `<div class="extra">
        <div><span class="mini-lb">Impacto na frequência</span>
          <div class="imp" style="margin-top:5px">${Object.entries(IMPACTOS).map(([k,v]) =>
            `<button data-imp="${k}" class="${f.impacto===k?'on':''}"
              style="${f.impacto===k?`background:${v.bg};color:${v.cor}`:''}">${v.label}</button>`).join('')}</div></div>
        <div><span class="mini-lb">Semanas afetadas</span>
          <div class="wks" style="margin-top:5px">${S.semanas.map((s,si) =>
            `<button data-wk="${si}" class="${f.semanas[si]?'on':''}">${s.nome.replace('Semana ','S')}</button>`).join('')}</div></div>
      </div>` : ''}
    </div>`;
  }).join('');

  $('fatores').querySelectorAll('.fat').forEach(el => {
    const f = S.fatores[+el.dataset.i];
    el.querySelector('[data-tg]').onclick = () => { f.ativo = !f.ativo; renderFatores(); sync(); };
    el.querySelector('[data-nm]').oninput = e => { f.label = e.target.value; sync(); };
    el.querySelector('[data-del]').onclick = () => {
      S.fatores = S.fatores.filter(x => x.id !== f.id); renderFatores(); sync(); };
    el.querySelectorAll('[data-imp]').forEach(b => b.onclick = () => {
      f.impacto = b.dataset.imp; renderFatores(); sync(); });
    el.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => {
      const i = +b.dataset.wk; f.semanas[i] = !f.semanas[i]; renderFatores(); sync(); });
  });
  $('addFator').innerHTML = svg('plus',12,2.5) + ' Outro fator';
}

/* ---- desconfortos: exercício, região, dor, conduta e ajuste ---- */
export function renderDesconfortos(){
  const d = S.desconfortos;
  $('tabDesconforto').innerHTML = `
    <thead><tr>
      <th style="text-align:left">Exercício</th><th style="text-align:left">Região / queixa</th>
      <th>Dor 0–10</th><th style="text-align:left">Conduta</th>
      <th style="text-align:left">Ajuste combinado</th><th></th>
    </tr></thead>
    <tbody>${d.length ? d.map((x,i) => `<tr class="ex-row">
      <td><input class="txt-in" data-i="${i}" data-f="exercicio" value="${esc(x.exercicio)}" placeholder="Ex.: Agachamento"/></td>
      <td><input class="txt-in" data-i="${i}" data-f="regiao" value="${esc(x.regiao)}" placeholder="Ex.: Joelho direito"/></td>
      <td><input class="dor-in" type="number" min="0" max="10" data-i="${i}" data-f="dor"
            value="${x.dor ?? ''}" placeholder="—" style="color:${x.dor >= 7 ? 'var(--alta)' : x.dor >= 4 ? 'var(--media)' : x.dor ? 'var(--baixa)' : 'var(--s300)'}"/></td>
      <td><select class="sel" data-i="${i}" data-f="conduta">
            ${CONDUTAS.map(c => `<option ${c===x.conduta?'selected':''}>${c}</option>`).join('')}</select></td>
      <td><input class="txt-in" data-i="${i}" data-f="ajuste" value="${esc(x.ajuste)}"
            placeholder="Ex.: leg press unilateral, amplitude parcial, 2 semanas"/></td>
      <td><button class="del" data-del="${i}" title="Remover">${svg('trash',13)}</button></td>
    </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--s400);font-size:12px">
        Nenhum desconforto registrado neste ciclo.</td></tr>`}</tbody>`;

  $('tabDesconforto').querySelectorAll('[data-f]').forEach(el => {
    const set = () => {
      const x = S.desconfortos[+el.dataset.i], f = el.dataset.f;
      x[f] = f === 'dor' ? (el.value === '' ? null : Math.max(0, Math.min(10, +el.value || 0))) : el.value;
      if (f === 'dor') el.style.color = x.dor >= 7 ? 'var(--alta)' : x.dor >= 4 ? 'var(--media)' : x.dor ? 'var(--baixa)' : 'var(--s300)';
      sync();
    };
    el.tagName === 'SELECT' ? el.onchange = set : el.oninput = set;
  });
  $('tabDesconforto').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    S.desconfortos.splice(+b.dataset.del,1); renderDesconfortos(); sync(); });

  $('addDesconforto').innerHTML = svg('plus',12,2.5) + ' Adicionar';
  $('descCont').textContent = d.length ? d.length + (d.length > 1 ? ' registros' : ' registro') : '';
}

export function renderAlertas(){
  $('alertas').innerHTML = ALERTAS.map(a =>
    `<button class="alerta ${S.alertas[a.id]?'on':''}" data-id="${a.id}">
       <span class="box">${svg('check',11,3)}</span>${a.label}</button>`).join('');
  $('alertas').querySelectorAll('.alerta').forEach(b => b.onclick = () => {
    S.alertas[b.dataset.id] = !S.alertas[b.dataset.id]; renderAlertas(); sync();
  });
}

export function renderTemplates(){
  $('templates').innerHTML = TEMPLATES.map(t => `<button class="tpl" data-id="${t.id}">${t.nome}</button>`).join('');
  $('templates').querySelectorAll('.tpl').forEach(b => b.onclick = () => {
    const t = TEMPLATES.find(x => x.id === b.dataset.id);
    S.metas = t.build(); S.aberta = S.metas[0].id; renderMetas(); sync();
  });
}

/* ================================================================== *
 *  RENDER — micro-metas
 * ================================================================== */
export function renderMetas(){
  $('metas').innerHTML = S.metas.map((m,i) => {
    const cat = CATEGORIAS[m.categoria], pr = PRIORIDADES[m.prioridade], st = STATUS[m.status];
    const total = m.acoes.length, feitas = m.acoes.filter(a=>a.feito).length;
    const pct = total ? Math.round(feitas/total*100) : 0;
    const open = S.imprimindo || S.aberta === m.id;

    return `<div class="tl-item">
      <div class="rail">
        <span class="num-badge" style="background:${cat.cor}">${i+1}</span>
        ${i < S.metas.length-1 ? '<span class="line"></span>' : ''}
      </div>
      <div class="meta ${open?'open':''}" data-id="${m.id}">
        <button class="meta-head" data-act="toggle">
          <span class="meta-ico" style="background:${cat.cor}26;color:${cat.cor}">${svg(cat.icon)}</span>
          <span style="flex:1;min-width:0">
            <span class="pills">
              <span class="tiny" style="font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--s400)">${esc(m.semana)}</span>
              <span class="pill" style="background:${pr.bg};color:${pr.cor}">${pr.label}</span>
              <span class="status-txt" style="color:${st.cor}">${svg(st.icon,12,2)}${st.label}</span>
            </span>
            <span class="meta-title" style="display:block">${esc(m.titulo)}</span>
            ${m.indicador ? `<span class="meta-ind" style="display:block">${esc(m.indicador)}${m.alvo?` <b>→ ${esc(m.alvo)} ${esc(m.unidade)}</b>`:''}</span>` : ''}
          </span>
          ${total ? `<span class="meta-prog">
            <span class="between tiny" style="color:var(--s400);margin-bottom:4px"><span>ações</span><span class="num">${feitas}/${total}</span></span>
            <span class="bar" style="display:block"><i style="background:${cat.cor};width:${pct}%"></i></span>
          </span>` : ''}
          <span class="chev">${svg('chevron',16,2)}</span>
        </button>

        ${open ? `<div class="meta-body">
          <div class="grid" style="grid-template-columns:1fr 2fr;gap:12px">
            <div><span class="label">Semana / período</span>
              <input class="txt-in" data-f="semana" value="${esc(m.semana)}"/></div>
            <div><span class="label">Título da meta</span>
              <input class="txt-in" data-f="titulo" style="font-weight:500;color:var(--s800)" value="${esc(m.titulo)}"/></div>
          </div>

          <div><span class="label">Pilar</span>
            <div class="cats">${Object.entries(CATEGORIAS).map(([k,c]) =>
              `<button class="cat ${m.categoria===k?'on':''}" data-cat="${k}"
                style="${m.categoria===k?`background:${c.cor}`:''}">${svg(c.icon,14)}${c.label}</button>`).join('')}
            </div></div>

          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
            <div><span class="label">Prioridade</span>
              <div class="seg">${Object.entries(PRIORIDADES).map(([k,p]) =>
                `<button data-prio="${k}" class="${m.prioridade===k?'on':''}"
                  style="${m.prioridade===k?`background:${p.bg};color:${p.cor}`:''}">${p.label}</button>`).join('')}
              </div></div>
            <div><span class="label">Status</span>
              <div class="seg status">${Object.entries(STATUS).map(([k,s]) =>
                `<button data-status="${k}" class="${m.status===k?'on':''}"
                  style="${m.status===k?`color:${s.cor}`:''}">${svg(s.icon,13,2)}<span>${s.label}</span></button>`).join('')}
              </div></div>
          </div>

          <div class="panel">
            <span class="label">Como vamos medir</span>
            <div class="measure">
              <input data-f="indicador" value="${esc(m.indicador)}" placeholder="Indicador (ex.: treinos registrados)"/>
              <input data-f="alvo" value="${esc(m.alvo)}" placeholder="Meta"/>
              <input data-f="unidade" value="${esc(m.unidade)}" placeholder="unidade"/>
            </div>
          </div>

          <div><span class="label">Por que essa meta agora</span>
            <textarea data-f="detalhe" rows="2" placeholder="O racional que você explicou na call — a aluna precisa entender o porquê para sustentar.">${esc(m.detalhe)}</textarea></div>

          <div>
            <div class="between" style="margin-bottom:9px">
              <span class="label" style="margin:0">Ações concretas</span>
              <button class="ghost outline" data-act="addAcao">${svg('plus',12,2.5)}Adicionar</button>
            </div>
            ${total ? m.acoes.map(a => `<div class="acao ${a.feito?'done':''}" data-aid="${a.id}">
                <button class="tick" data-act="tick" style="${a.feito?`background:${cat.cor}`:''}">${svg('check',11,3)}</button>
                <input data-act="acaoTxt" value="${esc(a.texto)}" placeholder="Descreva a ação..."/>
                <button class="del" data-act="delAcao" aria-label="Remover">${svg('trash',13)}</button>
              </div>`).join('')
              : '<p class="empty">Nenhuma ação ainda — quebre a meta em passos executáveis.</p>'}
          </div>

          <div class="panel">
            <span class="label">${svg('shield',13)} Plano B — se a semana virar</span>
            <textarea data-f="contingencia" rows="2" style="background:#fff"
              placeholder="A versão reduzida da meta, combinada antes de precisar dela.">${esc(m.contingencia)}</textarea>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--s100);padding-top:12px">
            <button class="ghost" data-act="dup">${svg('copy',13)}Duplicar</button>
            <button class="ghost danger" data-act="del" ${S.metas.length<=1?'disabled style="opacity:.4;cursor:not-allowed"':''}>${svg('trash',13)}Remover</button>
          </div>
        </div>` : ''}
      </div></div>`;
  }).join('');

  bindMetas();
  renderDistribuicao();
}

export function bindMetas(){
  $('metas').querySelectorAll('.meta').forEach(el => {
    const id = el.dataset.id;
    const m  = S.metas.find(x => x.id === id);
    const q  = sel => el.querySelectorAll(sel);

    el.querySelector('[data-act=toggle]').onclick = () => {
      S.aberta = S.aberta === id ? null : id; renderMetas();
    };

    // campos de texto — atualizam o estado sem re-render (preserva o cursor)
    q('[data-f]').forEach(inp => inp.oninput = () => {
      m[inp.dataset.f] = inp.value;
      const t = el.querySelector('.meta-title'); if (t) t.textContent = m.titulo;
      sync();
    });

    q('[data-cat]').forEach(b => b.onclick = () => { m.categoria = b.dataset.cat; renderMetas(); sync(); });
    q('[data-prio]').forEach(b => b.onclick = () => { m.prioridade = b.dataset.prio; renderMetas(); sync(); });
    q('[data-status]').forEach(b => b.onclick = () => { m.status = b.dataset.status; renderMetas(); sync(); });

    const addA = el.querySelector('[data-act=addAcao]');
    if (addA) addA.onclick = () => { m.acoes.push({ id:uid(), texto:'', feito:false }); renderMetas(); sync(); };

    q('.acao').forEach(row => {
      const a = m.acoes.find(x => x.id === row.dataset.aid);
      row.querySelector('[data-act=tick]').onclick   = () => { a.feito = !a.feito; renderMetas(); sync(); };
      row.querySelector('[data-act=delAcao]').onclick = () => {
        m.acoes = m.acoes.filter(x => x.id !== a.id); renderMetas(); sync(); };
      row.querySelector('[data-act=acaoTxt]').oninput = e => { a.texto = e.target.value; sync(); };
    });

    const dup = el.querySelector('[data-act=dup]');
    if (dup) dup.onclick = () => {
      const i = S.metas.findIndex(x => x.id === id);
      S.metas.splice(i + 1, 0, { ...m, id:uid(), titulo:m.titulo + ' (cópia)',
        acoes:m.acoes.map(a => ({ ...a, id:uid(), feito:false })) });
      renderMetas(); sync();
    };
    const del = el.querySelector('[data-act=del]');
    if (del) del.onclick = () => {
      if (S.metas.length <= 1) return;
      S.metas = S.metas.filter(x => x.id !== id);
      if (S.aberta === id) S.aberta = null;
      renderMetas(); sync();
    };
  });
}

export function renderDistribuicao(){
  $('distPilares').innerHTML = Object.entries(CATEGORIAS).map(([k,c]) => {
    const n = S.metas.filter(m => m.categoria === k).length;
    if (!n) return '';
    return `<span class="tag" style="background:${c.cor}1F">
      <span style="color:${c.cor};display:flex">${svg(c.icon,12,2)}</span>${c.label} · ${n}</span>`;
  }).join('');
}

/* ================================================================== *
 *  SYNC — recalcula tudo o que é derivado
 *  As 4 seções abaixo (bem-estar, carga, frequência, pilares) fazem
 *  redraw de canvas (Chart.js) ou reconstrução de DOM — caras demais
 *  para rodar a cada tecla em QUALQUER campo do app. `dirty` marca só
 *  a seção realmente afetada pela última mudança; o resto é ignorado
 *  até o próprio campo relevante mudar de novo.
 * ================================================================== */
export const dirty = { bem:true, carga:true, freq:true, pilares:true };

export function sync(){
  const a = adesao(), b = badge(), pp = progressoPlano();

  $('avatar').textContent = iniciais() || '·';
  $('mesLabel').textContent = mesLabel();
  $('badgeBox').style.background = b.bg;
  $('badgePct').style.color = b.cor;
  $('badgePct').innerHTML = a + '%<span class="txt" id="badgeTxt">' + b.txt + '</span>';

  $('kpiTreinos').textContent = S.realizados + '/' + S.previstos;
  $('kpiTreinosHint').textContent = a + '% do previsto no mês';
  $('barTreinos').style.width = Math.min(a,100) + '%';

  if (dirty.bem){
    const gd = grupoBem('disposicao'), gr = grupoBem('recuperacao');
    const md = mediaGrupo(gd), mr = mediaGrupo(gr);
    $('kpiEnergia').innerHTML = fmt1(md) + '<span>/10</span>';
    $('kpiRecup').innerHTML   = fmt1(mr) + '<span>/10</span>';
    $('hintEnergia').textContent = 'Média de ' + gd.itens.map(f => (f.label||'—').toLowerCase()).join(', ');
    $('hintRecup').textContent   = 'Média de ' + gr.itens.map(f => (f.label||'—').toLowerCase()).join(', ');
    renderMini('miniDisposicao', gd);
    renderMini('miniRecuperacao', gr);

    chartBem.data.labels = S.semanas.map(s => s.nome);
    chartBem.data.datasets = S.bemestar.map(g => ({
      label:g.label, data:S.semanas.map((_,i) => mediaSemana(g,i)),
      borderColor:g.cor, backgroundColor:g.cor + '33', fill:true, tension:.35,
      borderWidth:2, pointRadius:3, pointBackgroundColor:'#fff', pointBorderWidth:2, spanGaps:true
    }));
    chartBem.update('none');

    $('bemHint').textContent = S.bemestar.reduce((n,g) => n + g.itens.length, 0) +
      ' sub-fatores · ' + S.semanas.length + ' semanas';
    dirty.bem = false;
  }

  $('lazerCont').textContent = S.lazer.filter(a => a.feito).length + '/' + S.lazer.length + ' realizados';

  if (dirty.carga){
    const ev = evolucaoCarga();
    renderAnalise();
    $('kpiCarga').innerHTML = (ev > 0 ? '+' : '') + ev + '<span>%</span>';
    $('barCarga').style.width = Math.min(Math.abs(ev) * 2, 100) + '%';

    const g = grupoAtivo();
    chartCarga.data.labels = S.prog.sessoes.map(labelSessao);
    chartCarga.data.datasets = g.exercicios.map(e => ({
      label: e.nome || 'Sem nome',
      data: e.cargas.map(v => (v === '' || v == null) ? null : Number(v)),
      borderColor:e.cor, backgroundColor:e.cor + '33', fill:true, tension:.35,
      borderWidth:2, pointRadius:3, pointBackgroundColor:'#fff', pointBorderWidth:2, spanGaps:true
    }));
    chartCarga.update('none');
    dirty.carga = false;
  }

  $('planoPct').textContent = pp + '%';
  $('planoBar').style.width = pp + '%';

  const ativos = S.fatores.filter(f => f.ativo);
  const altos  = ativos.filter(f => f.impacto === 'alto').length;
  $('fatoresBadge').textContent = ativos.length
    ? `${ativos.length} fator${ativos.length>1?'es':''}${altos ? ` · ${altos} de alto impacto` : ''}` : '';
  $('fatoresBadge').style.display = ativos.length ? '' : 'none';

  const nAlertas = ALERTAS.filter(x => S.alertas[x.id]).length;
  $('resumo').textContent = `${S.aluna} · ${mesLabel()} · adesão ${a}% · ` +
    (ativos.length ? ativos.map(f => f.label).join(', ') : 'sem fatores limitantes registrados') +
    (S.desconfortos.length ? ` · ${S.desconfortos.length} desconforto${S.desconfortos.length>1?'s':''}` : '') +
    (nAlertas ? ` · ${nAlertas} sinal${nAlertas>1?'is':''} de atenção` : '');

  if (dirty.freq){
    chartFreq.data.datasets[0].data = S.semanas.map(s => s.previsto);
    chartFreq.data.datasets[1].data = S.semanas.map(s => s.realizado);
    chartFreq.update('none');
    dirty.freq = false;
  }

  if (dirty.pilares){
    chartPilares.data.datasets[0].data = S.pilares.map(p => p.valor);
    chartPilares.update('none');
    dirty.pilares = false;
  }

  $('btnConcluir').classList.toggle('done', !!S.concluida);
  $('btnConcluirTxt').textContent = S.concluida ? 'Reunião concluída' : 'Concluir reunião';

  renderComparacao();
  salvar();
}

