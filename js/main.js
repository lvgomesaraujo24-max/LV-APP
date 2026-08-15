import { $, S, uid, novoFator, novoDesconforto, proxCor, grupoAtivo, todosExercicios } from './state.js';
import { iniciais, adesao, mediaGrupo, grupoBem, fmt1, evolucaoCarga, mesLabel } from './derived.js';
import { atualizaHidratacao, metaPorPeso, dirty, sync, renderTemplates, renderFatores, renderDesconfortos,
         renderLazer, renderProgressao, renderMetas, scoreHidratacao, proximaData } from './ui.js';
import { carregarAtual, aplicar, lerStore, gravarStore, renderCiclos, salvar, mesCurto,
         modalConfirm, modalAlert, renderTudo } from './persistence.js';
import { gerarPreview, gerarPDF, enviarEmail, statusMail, lerCfg, gravarCfg, pctTxt,
         VARS_TEMPLATE } from './report.js';

/* ================================================================== *
 *  BOOT
 * ================================================================== */
$('aluna').oninput = e => {
  S.aluna = e.target.value;
  $('avatar').textContent = iniciais() || '·';
};
$('aluna').onchange = () => carregarAtual();
$('mes').onchange   = e => { S.mes = e.target.value; carregarAtual(); };
$('obs').oninput            = e => { S.obs = e.target.value; salvar(); };
$('hidObs').oninput  = e => { S.hidratacao.obs = e.target.value; salvar(); };
$('hidMeta').oninput = e => { S.hidratacao.meta = +e.target.value || 0; atualizaHidratacao(); dirty.pilares = true; sync(); };
$('hidPeso').oninput = e => { S.hidratacao.peso = e.target.value === '' ? null : (+e.target.value || 0); atualizaHidratacao(); salvar(); };
$('hidSugerir').onclick = () => {
  const kg = S.hidratacao.peso;
  if (!kg){ $('hidPeso').focus(); return; }
  S.hidratacao.meta = metaPorPeso(kg);
  $('hidMeta').value = S.hidratacao.meta;
  atualizaHidratacao(); dirty.pilares = true; sync();
};
$('encaminhamento').oninput = e => { S.encaminhamento = e.target.value; salvar(); };

renderTemplates();

/* --- controles de ciclo --- */
$('ciclosSel').onchange = e => {
  const [k,m] = e.target.value.split('|');
  const snap = lerStore().alunas[k]?.ciclos[m];
  if (snap) aplicar(snap);
};
$('btnNovo').onclick = async () => {
  const ok = await modalConfirm('Começar um ciclo em branco? O ciclo atual continua salvo no histórico.');
  if (!ok) return;
  const d = new Date(); d.setMonth(d.getMonth() + 1);
  S.mes = d.toISOString().slice(0,7);
  S.realizados = 0;
  S.semanas.forEach(s => s.realizado = 0);
  Object.values(S.prog.grupos).forEach(g => g.exercicios.forEach(e => e.cargas = S.prog.sessoes.map(()=>null)));
  S.bemestar.forEach(g => g.itens.forEach(f => f.notas = S.semanas.map(()=>null)));
  S.pilares.forEach(p => p.valor = 0);
  S.hidratacao.semanas = S.semanas.map(()=>null); S.hidratacao.obs = '';
  S.lazer.forEach(a => a.feito = false);
  S.fatores.forEach(f => { f.ativo = false; f.semanas = S.semanas.map(()=>false); });
  S.desconfortos = []; S.alertas = {}; S.encaminhamento = ''; S.obs = ''; S.concluida = false;
  S.metas.forEach(m => { m.status = 'planejada'; m.acoes.forEach(a => a.feito = false); });
  $('mes').value = S.mes; $('obs').value = ''; $('encaminhamento').value = '';
  renderTudo(); gerarPreview();
};
$('btnExpJson').onclick = () => {
  const blob = new Blob([JSON.stringify(lerStore(), null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `consultoria-treino-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
};
$('impFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const novo = JSON.parse(r.result);
      if (!novo.alunas) throw 0;
      const st = lerStore();
      Object.entries(novo.alunas).forEach(([k,a]) => {
        st.alunas[k] = st.alunas[k] || { nome:a.nome, ciclos:{} };
        Object.assign(st.alunas[k].ciclos, a.ciclos);
      });
      gravarStore(st); renderCiclos();
      modalAlert('Dados importados. Selecione o ciclo desejado na lista.');
    } catch { modalAlert('Arquivo inválido — use um export gerado por este dashboard.'); }
    e.target.value = '';
  };
  r.readAsText(f);
};

$('btnDelCiclo').onclick = async () => {
  const v = $('ciclosSel').value;
  if (!v || !v.includes('|')) return;
  const [k,m] = v.split('|');
  const st = lerStore();
  const a = st.alunas[k];
  if (!a || !a.ciclos[m]) return;
  const ok = await modalConfirm(`Excluir o ciclo "${a.nome} — ${mesCurto(m)}/${m.split('-')[0]}"? Esta ação não pode ser desfeita.`);
  if (!ok) return;
  delete a.ciclos[m];
  if (Object.keys(a.ciclos).length === 0) delete st.alunas[k];
  gravarStore(st);
  renderCiclos();
};

carregarAtual();

$('addFator').onclick = () => {
  S.fatores.push(novoFator('', true)); renderFatores(); sync();
  const ns = $('fatores').querySelectorAll('.fat-name');
  ns[ns.length - 1]?.focus();
};
$('addDesconforto').onclick = () => {
  S.desconfortos.push(novoDesconforto()); renderDesconfortos(); sync();
  const ns = $('tabDesconforto').querySelectorAll('[data-f=exercicio]');
  ns[ns.length - 1]?.focus();
};

$('addLazer').onclick = () => {
  S.lazer.push({ id:uid(), texto:'', feito:false });
  renderLazer(); sync();
  const ins = $('lazerLista').querySelectorAll('input');
  ins[ins.length - 1]?.focus();
};

$('addExercicio').onclick = () => {
  const g = grupoAtivo();
  g.exercicios.push({ id:uid(), nome:'', cor:proxCor(todosExercicios()),
    cargas:S.prog.sessoes.map(() => null) });
  renderProgressao(); dirty.carga = true; sync();
  const inputs = $('tabCarga').querySelectorAll('.ex-name');
  inputs[inputs.length - 1]?.focus();
};
$('addSessao').onclick = () => {
  S.prog.sessoes.push({ id:uid(), data:proximaData() });
  Object.values(S.prog.grupos).forEach(gr => gr.exercicios.forEach(e => e.cargas.push(null)));
  renderProgressao(); dirty.carga = true; sync();
};

$('addMeta').onclick = () => {
  const id = uid();
  S.metas.push({ id, semana:'Semana ' + (S.metas.length + 1), titulo:'Nova micro-meta',
    categoria:'treino', prioridade:'media', status:'planejada', detalhe:'',
    indicador:'', alvo:'', unidade:'', contingencia:'', acoes:[] });
  S.aberta = id; renderMetas(); sync();
};
/* --- e-mail --- */
(() => {
  const cfg = lerCfg();
  $('cfgService').value  = cfg.service  || '';
  $('cfgTemplate').value = cfg.template || '';
  $('cfgKey').value      = cfg.key      || '';
  $('mailResponder').value = cfg.responder || '';
  if (!cfg.service || !cfg.template || !cfg.key) $('cfgMail').style.display = '';
})();

const salvarCfgMail = () => gravarCfg({
  service:$('cfgService').value.trim(), template:$('cfgTemplate').value.trim(),
  key:$('cfgKey').value.trim(), responder:$('mailResponder').value.trim()
});
['cfgService','cfgTemplate','cfgKey','mailResponder'].forEach(id => $(id).oninput = salvarCfgMail);

$('btnCfgMail').onclick = () => {
  const c = $('cfgMail');
  c.style.display = c.style.display === 'none' ? '' : 'none';
};

/* lista de variáveis do template, clicáveis para copiar */
$('varsTemplate').innerHTML = VARS_TEMPLATE
  .map(v => `<button class="tpl" data-v="{{${v}}}">{{${v}}}</button>`).join('');
$('varsTemplate').querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
  try {
    await navigator.clipboard.writeText(b.dataset.v);
    const antes = b.textContent;
    b.textContent = 'copiado!';
    setTimeout(() => { b.textContent = antes; }, 1200);
  } catch { /* sem permissão de área de transferência: o texto já está visível */ }
});

$('btnTesteMail').onclick = () => enviarEmail({ teste:true });
$('mailPara').oninput = e => { S.email = e.target.value; salvar(); };
$('btnPreview').onclick = gerarPreview;
$('btnEnviar').onclick  = () => enviarEmail();
$('btnCopiar').onclick  = async () => {
  try { await navigator.clipboard.writeText($('mailCorpo').value); statusMail('Texto copiado.', 'var(--baixa)'); }
  catch { $('mailCorpo').select(); statusMail('Selecione e copie manualmente.', 'var(--media)'); }
};
$('btnPdf').onclick = () => {
  try { gerarPDF(); statusMail('PDF salvo em Downloads — agora é só anexar no e-mail.', 'var(--baixa)'); }
  catch(e){ statusMail('Não foi possível gerar o PDF: ' + e.message + '. Use "Exportar resumo / PDF" no rodapé.', 'var(--alta)'); }
};
$('btnMailto').onclick = () => {
  /* corpo integral costuma estourar o limite do mailto — cai para um resumo curto */
  const corpo = $('mailCorpo').value;
  const curto = corpo.length > 1500 ? [
    `Olá, ${S.aluna.split(' ')[0]}!`, '',
    `Segue o resumo do seu ciclo de ${mesLabel()}:`, '',
    `• Treinos: ${S.realizados}/${S.previstos} — ${adesao()}% de adesão`,
    `• Disposição: ${fmt1(mediaGrupo(grupoBem('disposicao')))}/10`,
    `• Recuperação: ${fmt1(mediaGrupo(grupoBem('recuperacao')))}/10`,
    `• Evolução de carga: ${pctTxt(evolucaoCarga())}`,
    `• Hidratação: ${scoreHidratacao() === null ? 'sem registro' : scoreHidratacao() + '% da meta'}`, '',
    'Plano do próximo ciclo:',
    ...S.metas.map(m => `  ${m.semana}: ${m.titulo}`), '',
    'O relatório completo está no PDF em anexo.', '',
    'Qualquer dúvida é só me chamar!'
  ].join('\n') : corpo;

  window.location.href = `mailto:${encodeURIComponent($('mailPara').value)}` +
    `?subject=${encodeURIComponent($('mailAssunto').value)}&body=${encodeURIComponent(curto)}`;

  statusMail(corpo.length > 1500
    ? 'Abri com o resumo curto — anexe o PDF baixado para enviar o relatório completo.'
    : 'E-mail aberto no seu aplicativo.', 'var(--s500)');
};

/* --- impressão: abre todas as metas e expande os textos antes de gerar o PDF --- */
function prepararImpressao(){
  S.imprimindo = true;
  renderMetas();
  document.querySelectorAll('textarea').forEach(t => {
    t.dataset.h = t.style.height;
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  });
}
function restaurarTela(){
  S.imprimindo = false;
  renderMetas();
  document.querySelectorAll('textarea').forEach(t => { t.style.height = t.dataset.h || ''; });
}
window.addEventListener('beforeprint', prepararImpressao);
window.addEventListener('afterprint', restaurarTela);

$('btnExport').onclick = () => {
  prepararImpressao();
  setTimeout(() => { window.print(); setTimeout(restaurarTela, 300); }, 60);
};
$('btnConcluir').onclick = () => { S.concluida = !S.concluida; sync(); };

sync();
