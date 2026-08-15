import { $, S, ALERTAS } from './state.js';
import { adesao, badge, grupoBem, fmt1, mediaGrupo, evolucaoCarga,
         extremosCarga, mesLabel } from './derived.js';
import { scoreHidratacao, classeHidratacao, mediaAgua } from './ui.js';
import { cicloAnterior, metricas, mesCurto, slug } from './persistence.js';

/* ================================================================== *
 *  RELATÓRIO EM TEXTO + ENVIO POR E-MAIL
 * ================================================================== */
export const CFG_MAIL = 'consultoria_email_cfg_v1';
export const lerCfg = () => { try { return JSON.parse(localStorage.getItem(CFG_MAIL)) || {}; } catch { return {}; } };
export const gravarCfg = c => { try { localStorage.setItem(CFG_MAIL, JSON.stringify(c)); } catch {} };

export const pctTxt = v => v === null || v === undefined ? '—' : (v > 0 ? '+' : '') + v + '%';

/* ------------------------------------------------------------------ *
 *  O relatório é montado UMA vez, como blocos estruturados, e depois
 *  renderizado em dois formatos: texto (corpo do e-mail) e PDF.
 *  Antes o PDF relia o texto já pronto e adivinhava por regex o que era
 *  título ("linha em CAIXA ALTA com 6+ caracteres") — daí a formatação
 *  irregular.
 *
 *  O que deliberadamente NÃO entra, por ser material de acompanhamento
 *  seu e não leitura da aluna:
 *    - S.obs ("Observações da sessão": contexto pessoal, o que reforçar
 *      na próxima conversa) — antes ia inteiro no e-mail dela;
 *    - percentuais dos pilares e classificação de impacto dos fatores;
 *    - a tabela semana a semana de cada sub-fator de bem-estar.
 * ------------------------------------------------------------------ */
function relatorioBlocos(){
  const B = [];
  const ant = cicloAnterior();
  const cmp = ant ? metricas(ant) : null;
  /* variação contra o ciclo anterior — some quando não há base ou não mudou */
  const vs = (atual, chave, un = '') => {
    if (!cmp || cmp[chave] == null || atual == null) return '';
    const d = Math.round((atual - cmp[chave]) * 10) / 10;
    return d ? `  (${d > 0 ? '+' : ''}${fmt1(d)}${un} vs ${mesCurto(ant.mes)})` : '';
  };

  const primeiro = (S.aluna || '').trim().split(/\s+/)[0];
  B.push({ t:'p', v: primeiro ? `Olá, ${primeiro}!` : 'Olá!' });
  B.push({ t:'p', v:`Fechamos ${mesLabel()} — segue o resumo do seu ciclo.` });

  /* --- como foi --- */
  const a = adesao(), ev = evolucaoCarga();
  B.push({ t:'h', v:'COMO FOI' });
  B.push({ t:'li', v:`Treinos: ${S.realizados} de ${S.previstos} — ${a}% de adesão (${badge().txt})${vs(a,'adesao','pp')}` });
  B.push({ t:'li', v:'Por semana: ' + S.semanas.map(s => `${s.nome.replace('Semana ','S')} ${s.realizado}/${s.previsto}`).join(' · ') });
  B.push({ t:'li', v:`Evolução de carga: ${pctTxt(ev)}${vs(ev,'carga','pp')}` });
  B.push({ t:'li', v:`Disposição ${fmt1(mediaGrupo(grupoBem('disposicao')))}/10 · Recuperação ${fmt1(mediaGrupo(grupoBem('recuperacao')))}/10` });
  const sc = scoreHidratacao();
  if (sc !== null)
    B.push({ t:'li', v:`Hidratação: ${fmt1(mediaAgua())} L/dia — ${sc}% da meta (${classeHidratacao(sc).txt})` });

  /* --- destaques de carga: só fazem sentido com 2+ exercícios medidos --- */
  const ex = extremosCarga();
  if (ex && ex.n > 1){
    B.push({ t:'h', v:'DESTAQUES' });
    B.push({ t:'li', v:`Maior evolução: ${ex.melhor.nome} ${pctTxt(ex.melhor.d)}` });
    B.push({ t:'li', v:`Menor evolução: ${ex.pior.nome} ${pctTxt(ex.pior.d)}` });
  }

  /* --- blocos que só aparecem se houver o que dizer --- */
  if (S.desconfortos.length){
    B.push({ t:'h', v:'AJUSTES COMBINADOS' });
    S.desconfortos.forEach(d => B.push({ t:'li',
      v:`${d.exercicio || 'Exercício'} — ${d.regiao || 'queixa'}` +
        `${d.dor != null ? ` (dor ${d.dor}/10)` : ''}: ${d.conduta}${d.ajuste ? ' — ' + d.ajuste : ''}` }));
  }

  const al = ALERTAS.filter(x => S.alertas[x.id]);
  if (al.length){
    B.push({ t:'h', v:'SINAIS PARA ACOMPANHAR' });
    al.forEach(x => B.push({ t:'li', v:x.label }));
    if (S.encaminhamento) B.push({ t:'li', v:`Encaminhamento: ${S.encaminhamento}` });
  }

  const lz = S.lazer.filter(x => x.feito && x.texto.trim());
  if (lz.length)
    B.push({ t:'h', v:'AUTOCUIDADO' },
           { t:'li', v:`${lz.length} de ${S.lazer.length}: ` + lz.map(x => x.texto).join(', ') });

  /* --- o plano: a parte acionável, e por isso a única detalhada --- */
  if (S.metas.length){
    B.push({ t:'h', v:'SEU PLANO PARA O PRÓXIMO CICLO' });
    S.metas.forEach((m, i) => B.push({ t:'meta', n:i + 1, m }));
  }

  B.push({ t:'p', v:'Qualquer dúvida é só me chamar. Bom ciclo!' });
  return B;
}

/** meta → "Meta: indicador → alvo unidade", ou '' se não houver indicador.
 *  "%" cola no número; qualquer outra unidade ("kg", "sessões/sem") leva espaço. */
const linhaMeta = m => {
  if (!m.indicador) return '';
  const un = (m.unidade || '').trim();
  const alvo = String(m.alvo ?? '').trim();
  return `Meta: ${m.indicador}` +
    (alvo ? ` → ${alvo}${un ? (un === '%' ? un : ' ' + un) : ''}` : '');
};

/* O texto de contingência já costuma vir com a própria condição
 * ("Se o dia apertar...", "Se a técnica quebrar..."), então um rótulo
 * condicional duplicaria a frase. "Plano B" encaixa antes de qualquer uma. */
const PLANO_B = 'Plano B: ';

export function relatorioTexto(){
  const L = [];
  relatorioBlocos().forEach(b => {
    switch (b.t){
      case 'p':
        if (L.length && L[L.length - 1] !== '') L.push('');
        L.push(b.v, '');
        break;
      case 'h':
        if (L.length && L[L.length - 1] !== '') L.push('');
        L.push(b.v);
        break;
      case 'li':
        L.push('• ' + b.v);
        break;
      case 'meta': {
        const m = b.m;
        L.push('', `${b.n}. ${m.semana} — ${m.titulo}`);
        const lm = linhaMeta(m);
        if (lm) L.push('   ' + lm);
        m.acoes.forEach(x => { if (x.texto.trim()) L.push(`   • ${x.texto}`); });
        if (m.contingencia) L.push(`   ${PLANO_B}${m.contingencia}`);
        break;
      }
    }
  });
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function gerarPreview(){
  $('mailCorpo').value = relatorioTexto();
  $('mailAssunto').value = `Seu acompanhamento de ${mesLabel()} — ${S.aluna}`;
}

/* ---- PDF do relatório, gerado na própria página ---- */
export const nomeArquivo = () => `relatorio-${slug(S.aluna)}-${S.mes}.pdf`;

export function gerarPDF(baixar = true){
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('biblioteca de PDF não carregou');

  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const M = 18, W = 210, LARG = W - M * 2, RODAPE = 272;
  let y = 0, pag = 1;

  const rodape = () => {
    doc.setFont('helvetica','normal').setFontSize(7.5).setTextColor(168);
    doc.text('Consultoria de Treino · acompanhamento mensal', M, 288);
    doc.text(String(pag), W - M, 288, { align:'right' });
  };
  const novaPagina = () => { rodape(); doc.addPage(); pag++; y = M; };
  const espaco = h => { if (y + h > RODAPE) novaPagina(); };

  /* As fontes padrão do jsPDF falam Windows-1252. O que está fora dessa
   * tabela vira lixo — "◦" saía impresso como "%æ" — ou força a string
   * inteira para UTF-16. Trocamos os poucos símbolos que usamos por
   * equivalentes válidos e descartamos o resto (um emoji colado, por
   * exemplo). Atenção: cp1252 NÃO é Latin-1 — travessão, aspas curvas e
   * "•" são válidos apesar do code point passar de \xFF, então não podem
   * entrar no descarte. O corpo do e-mail mantém os caracteres originais. */
  const CP1252 = '\\u20AC\\u201A\\u0192\\u201E\\u2026\\u2020\\u2021\\u02C6\\u2030\\u0160' +
                 '\\u2039\\u0152\\u017D\\u2018\\u2019\\u201C\\u201D\\u2022\\u2013\\u2014' +
                 '\\u02DC\\u2122\\u0161\\u203A\\u0153\\u017E\\u0178';
  const foraDaTabela = new RegExp(`[^\\x00-\\xFF${CP1252}]`, 'g');
  const ansi = s => String(s)
    .replace(/→/g, '–').replace(/[◦∘]/g, '-')
    .replace(/[✓✔]/g, 'v').replace(/[─―]/g, '—')
    .replace(foraDaTabela, '');

  /** escreve com quebra de linha e recuo; devolve a altura consumida */
  const escreve = (txt, { size = 9.6, estilo = 'normal', cor = 70, recuo = 0, gap = 4.6 } = {}) => {
    doc.setFont('helvetica', estilo).setFontSize(size).setTextColor(cor);
    doc.splitTextToSize(ansi(txt), LARG - recuo).forEach(l => {
      espaco(gap);
      doc.text(l, M + recuo, y);
      y += gap;
    });
  };

  /* --- capa --- */
  doc.setFillColor(232,180,184); doc.rect(0, 0, W, 3.5, 'F');
  y = M + 4;
  escreve(S.aluna || 'Aluna', { size:18, estilo:'bold', cor:32, gap:7.5 });
  escreve(`Acompanhamento de ${mesLabel()}`, { size:10.5, cor:128, gap:5.4 });
  y += 1.5;
  doc.setDrawColor(228).line(M, y, W - M, y);
  y += 7;

  relatorioBlocos().forEach(b => {
    switch (b.t){
      case 'p':
        escreve(b.v, { size:10, cor:62 });
        y += 3;
        break;

      case 'h':
        /* título junto com pelo menos um item: nunca sozinho no pé */
        espaco(16);
        y += 3.5;
        escreve(b.v, { size:8.3, estilo:'bold', cor:152, gap:4.2 });
        doc.setDrawColor(234).line(M, y - 2.4, W - M, y - 2.4);
        y += 1.8;
        break;

      case 'li':
        espaco(6);
        doc.setFont('helvetica','normal').setFontSize(9.6).setTextColor(70);
        doc.text('•', M, y);
        escreve(b.v, { recuo:4.5 });
        y += 0.8;
        break;

      case 'meta': {
        const m = b.m;
        espaco(22);
        y += 2.8;
        escreve(`${b.n}. ${m.semana} — ${m.titulo}`, { size:10, estilo:'bold', cor:38, gap:5 });
        const lm = linhaMeta(m);
        if (lm) escreve(lm, { size:9.2, cor:112, recuo:4.5, gap:4.4 });
        m.acoes.forEach(x => {
          if (!x.texto.trim()) return;
          espaco(5.4);
          doc.setFont('helvetica','normal').setFontSize(9.4).setTextColor(78);
          doc.text('-', M + 4.5, y);
          escreve(x.texto, { size:9.4, recuo:9, gap:4.4 });
        });
        if (m.contingencia)
          escreve(`${PLANO_B}${m.contingencia}`, { size:9, cor:122, recuo:4.5, gap:4.3 });
        y += 2.8;
        break;
      }
    }
  });
  rodape();

  if (baixar) doc.save(nomeArquivo());
  return doc;
}

export function statusMail(txt, cor){
  $('mailStatus').textContent = txt;
  $('mailStatus').style.color = cor || 'var(--s500)';
}

export async function enviarEmail(){
  const cfg = lerCfg();
  const para = $('mailPara').value.trim();
  if (!cfg.service || !cfg.template || !cfg.key){
    $('cfgMail').style.display = '';
    return statusMail('Preencha as credenciais do EmailJS para enviar.', 'var(--alta)');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para))
    return statusMail('Informe um e-mail válido para a aluna.', 'var(--alta)');

  statusMail('Enviando...', 'var(--s500)');
  try {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        service_id: cfg.service, template_id: cfg.template, user_id: cfg.key,
        template_params:{
          to_email: para,
          to_name: S.aluna,
          reply_to: $('mailResponder').value.trim(),
          subject: $('mailAssunto').value,
          message: $('mailCorpo').value,
          mes: mesLabel(),
          adesao: adesao() + '%'
        }
      })
    });
    if (!r.ok) throw new Error(await r.text());
    const h = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    statusMail(`Enviado para ${para} às ${h}.`, 'var(--baixa)');
  } catch(err){
    statusMail('Não foi possível enviar: ' + String(err.message || err).slice(0,120), 'var(--alta)');
  }
}

