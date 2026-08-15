import { $, S, IMPACTOS, ALERTAS, CATEGORIAS, PRIORIDADES } from './state.js';
import { adesao, badge, grupoBem, fmt1, mediaGrupo, evolucaoCarga, mediaDelta, deltaExercicio,
         extremosCarga, media, mesLabel } from './derived.js';
import { scoreHidratacao, classeHidratacao } from './ui.js';
import { cicloAnterior, metricas, mesCurto, slug } from './persistence.js';

/* ================================================================== *
 *  RELATÓRIO EM TEXTO + ENVIO POR E-MAIL
 * ================================================================== */
export const CFG_MAIL = 'consultoria_email_cfg_v1';
export const lerCfg = () => { try { return JSON.parse(localStorage.getItem(CFG_MAIL)) || {}; } catch { return {}; } };
export const gravarCfg = c => { try { localStorage.setItem(CFG_MAIL, JSON.stringify(c)); } catch {} };

export const linha = '─'.repeat(46);
export const pctTxt = v => v === null || v === undefined ? '—' : (v > 0 ? '+' : '') + v + '%';

export function relatorioTexto(){
  const L = [];
  const a = adesao(), b = badge();
  const gd = grupoBem('disposicao'), gr = grupoBem('recuperacao');
  const ant = cicloAnterior();
  const cmp = ant ? metricas(ant) : null;
  const vs = (atual, chave, un = '') => {
    if (!cmp || cmp[chave] === null || atual === null) return '';
    const d = Math.round((atual - cmp[chave]) * 10) / 10;
    return `  (${d > 0 ? '+' : ''}${fmt1(d)}${un} vs ${mesCurto(ant.mes)})`;
  };

  L.push(`Olá, ${S.aluna.split(' ')[0]}!`, '',
    `Segue o resumo do seu ciclo de ${mesLabel()}.`, '', linha, '');

  /* 1. visão geral */
  L.push('VISÃO GERAL', '',
    `• Treinos: ${S.realizados} de ${S.previstos} previstos — ${a}% de adesão (${b.txt})${vs(a,'adesao','pp')}`,
    `• Disposição: ${fmt1(mediaGrupo(gd))}/10${vs(mediaGrupo(gd),'disposicao','')}`,
    `• Recuperação: ${fmt1(mediaGrupo(gr))}/10${vs(mediaGrupo(gr),'recuperacao','')}`,
    `• Evolução de carga: ${pctTxt(evolucaoCarga())}${vs(evolucaoCarga(),'carga','pp')}`,
    `• Hidratação: ${scoreHidratacao() === null ? 'sem registro' :
        scoreHidratacao() + '% da meta (' + classeHidratacao(scoreHidratacao()).txt + ')'}`, '');

  /* 2. frequência */
  L.push('FREQUÊNCIA POR SEMANA', '');
  S.semanas.forEach(s => L.push(`• ${s.nome}: ${s.realizado} de ${s.previsto} treinos`));
  L.push('');

  /* 3. cargas */
  L.push('PROGRESSÃO DE CARGA', '');
  Object.values(S.prog.grupos).forEach(g => {
    if (!g.exercicios.length) return;
    L.push(`${g.label.toUpperCase()} — média ${pctTxt(mediaDelta(g.exercicios))}`);
    g.exercicios.forEach(e => {
      const v = e.cargas.map(x => Number(x) || 0).filter(x => x > 0);
      if (!v.length) return;
      L.push(`  • ${e.nome || 'Sem nome'}: ${v[0]} kg → ${v[v.length-1]} kg  (${pctTxt(deltaExercicio(e))})`);
    });
    L.push('');
  });
  const ex = extremosCarga();
  if (ex){
    L.push(`Maior evolução: ${ex.melhor.nome} (${pctTxt(ex.melhor.d)})`,
           `Menor evolução: ${ex.pior.nome} (${pctTxt(ex.pior.d)})`, '');
  }

  /* 4. bem-estar */
  L.push('DISPOSIÇÃO E RECUPERAÇÃO', '');
  S.bemestar.forEach(g => {
    L.push(`${g.label.toUpperCase()} — média ${fmt1(mediaGrupo(g))}/10`);
    g.itens.forEach(f => L.push(`  • ${f.label || '—'}: ${f.notas.map(n => n ?? '–').join(' | ')}  (média ${fmt1(media(f.notas))})`));
    L.push('');
  });

  /* 5. hidratação */
  const H = S.hidratacao;
  L.push('HIDRATAÇÃO', '', `Meta: ${fmt1(Number(H.meta))} L por dia`);
  S.semanas.forEach((s,i) => L.push(`  • ${s.nome}: ${H.semanas[i] ? fmt1(Number(H.semanas[i])) + ' L/dia' : 'sem registro'}`));
  if (H.obs) L.push('', H.obs);
  L.push('');

  /* 6. pilares e autocuidado */
  L.push('DISTRIBUIÇÃO DA ROTINA', '');
  S.pilares.forEach(p => L.push(`• ${p.nome}: ${p.valor}%`));
  const lz = S.lazer.filter(x => x.feito);
  L.push('', `AUTOCUIDADO E LAZER — ${lz.length} de ${S.lazer.length} registros`);
  if (lz.length) lz.forEach(x => L.push(`  ✓ ${x.texto}`));
  L.push('');

  /* 7. diagnóstico */
  const fat = S.fatores.filter(f => f.ativo);
  L.push('O QUE ATRAPALHOU A FREQUÊNCIA', '');
  if (fat.length) fat.forEach(f => {
    const sem = f.semanas.map((v,i) => v ? S.semanas[i].nome.replace('Semana ','S') : null).filter(Boolean);
    L.push(`• ${f.label} — impacto ${IMPACTOS[f.impacto].label.toLowerCase()}${sem.length ? ' (' + sem.join(', ') + ')' : ''}`);
  });
  else L.push('Nenhum fator limitante registrado.');
  L.push('');

  if (S.desconfortos.length){
    L.push('DESCONFORTOS E AJUSTES', '');
    S.desconfortos.forEach(d => L.push(
      `• ${d.exercicio || 'Exercício'} — ${d.regiao || 'queixa'}${d.dor != null ? ` (dor ${d.dor}/10)` : ''}`,
      `  conduta: ${d.conduta}${d.ajuste ? ' — ' + d.ajuste : ''}`));
    L.push('');
  }
  const al = ALERTAS.filter(x => S.alertas[x.id]);
  if (al.length){
    L.push('PONTOS DE ATENÇÃO', '');
    al.forEach(x => L.push(`• ${x.label}`));
    if (S.encaminhamento) L.push(`Encaminhamento sugerido: ${S.encaminhamento}`);
    L.push('');
  }
  if (S.obs) L.push('OBSERVAÇÕES DA SESSÃO', '', S.obs, '');

  /* 8. micro-metas */
  L.push(linha, '', 'SEU PLANO PARA O PRÓXIMO CICLO', '');
  S.metas.forEach(m => {
    L.push(`${m.semana.toUpperCase()} — ${m.titulo}`);
    L.push(`Pilar: ${CATEGORIAS[m.categoria].label} · Prioridade ${PRIORIDADES[m.prioridade].label.toLowerCase()}`);
    if (m.indicador) L.push(`Meta: ${m.indicador} → ${m.alvo} ${m.unidade}`.trim());
    if (m.detalhe) L.push(`Por quê: ${m.detalhe}`);
    if (m.acoes.length){
      L.push('Ações:');
      m.acoes.forEach(x => L.push(`  ${x.feito ? '✓' : '□'} ${x.texto}`));
    }
    if (m.contingencia) L.push(`Plano B: ${m.contingencia}`);
    L.push('');
  });

  L.push(linha, '', 'Qualquer dúvida é só me chamar. Bom ciclo!');
  return L.join('\n');
}

export function gerarPreview(){
  $('mailCorpo').value = relatorioTexto();
  $('mailAssunto').value = `Seu acompanhamento de ${mesLabel()} — ${S.aluna}`;
}

/* ---- PDF do relatório, gerado na própria página ---- */
export const nomeArquivo = () =>
  `relatorio-${slug(S.aluna)}-${S.mes}.pdf`;

export function gerarPDF(baixar = true){
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('biblioteca de PDF não carregou');

  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const M = 16, W = 210, LARG = W - M*2;
  let y = 0, pag = 1;

  const rodape = () => {
    doc.setFont('helvetica','normal').setFontSize(7.5).setTextColor(160);
    doc.text('Consultoria de Treino · relatório de acompanhamento mensal', M, 287);
    doc.text(String(pag), W - M, 287, { align:'right' });
  };
  const novaPagina = () => { rodape(); doc.addPage(); pag++; y = M + 4; };
  const espaco = h => { if (y + h > 275) novaPagina(); };

  /* faixa de capa */
  doc.setFillColor(232,180,184); doc.rect(0, 0, W, 3, 'F');
  y = M + 6;
  doc.setFont('helvetica','bold').setFontSize(17).setTextColor(30);
  doc.text(S.aluna || 'Aluna', M, y); y += 7;
  doc.setFont('helvetica','normal').setFontSize(10.5).setTextColor(120);
  doc.text(`Acompanhamento de ${mesLabel()}  ·  adesão ${adesao()}% (${badge().txt})`, M, y);
  y += 5;
  doc.setDrawColor(230).line(M, y, W - M, y); y += 7;

  /* corpo: mesmo texto do e-mail, com títulos destacados */
  const linhas = $('mailCorpo').value.split('\n');
  linhas.forEach(ln => {
    const t = ln.trimEnd();
    if (!t){ y += 3; return; }
    if (/^─+$/.test(t)){ espaco(6); doc.setDrawColor(235).line(M, y, W - M, y); y += 5; return; }

    const titulo = /^[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ0-9 ,\/&()–-]{6,}$/.test(t) && !t.startsWith('•');
    doc.setFont('helvetica', titulo ? 'bold' : 'normal')
       .setFontSize(titulo ? 10 : 9.4)
       .setTextColor(titulo ? 40 : 70);
    if (titulo) y += 2;

    const wrap = doc.splitTextToSize(t, LARG);
    wrap.forEach(w => { espaco(5.4); doc.text(w, M, y); y += 4.7; });
    if (titulo) y += 1.2;
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

