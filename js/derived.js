/* ================================================================== *
 *  DERIVADOS
 * ================================================================== */
import { S, todosExercicios } from './state.js';

export const adesao = () => S.previstos > 0 ? Math.round(S.realizados / S.previstos * 100) : 0;

export function badge(){
  const a = adesao();
  if (a >= 85) return { txt:'Excelente', cor:'#7C9A82', bg:'rgba(168,191,165,.15)' };
  if (a >= 70) return { txt:'Boa',       cor:'#B99150', bg:'rgba(220,199,170,.18)' };
  if (a >= 50) return { txt:'Atenção',   cor:'#C87A7A', bg:'rgba(232,180,184,.18)' };
  return          { txt:'Crítica',  cor:'#C87A7A', bg:'rgba(200,122,122,.14)' };
}
/** Variação % de um exercício entre a primeira e a última sessão preenchidas */
export function deltaExercicio(e){
  const v = e.cargas.map(x => Number(x) || 0);
  const ini = v.findIndex(x => x > 0);
  const fim = v.reduce((acc,x,i) => x > 0 ? i : acc, -1);
  if (ini < 0 || fim <= ini) return null;
  return Math.round((v[fim] - v[ini]) / v[ini] * 100);
}
/** Média das variações de uma lista de exercícios */
export function mediaDelta(lista){
  const d = lista.map(deltaExercicio).filter(x => x !== null);
  return d.length ? Math.round(d.reduce((x,y)=>x+y,0) / d.length) : null;
}
/** Média das variações de todos os exercícios, superiores e inferiores */
export function evolucaoCarga(){ return mediaDelta(todosExercicios()) ?? 0; }

/** Exercícios com maior e menor evolução no ciclo */
export function extremosCarga(){
  const com = todosExercicios()
    .map(e => ({ nome:e.nome || 'Sem nome', cor:e.cor, d:deltaExercicio(e) }))
    .filter(x => x.d !== null)
    .sort((a,b) => b.d - a.d);
  return com.length ? { melhor:com[0], pior:com[com.length - 1], n:com.length } : null;
}

/* ---- bem-estar: médias ---- */
export const notasValidas = arr => arr.map(Number).filter(n => n > 0);
export const media = arr => notasValidas(arr).length
  ? notasValidas(arr).reduce((a,b)=>a+b,0) / notasValidas(arr).length : null;

/** média de um grupo em uma semana específica */
export function mediaSemana(grupo, i){ return media(grupo.itens.map(f => f.notas[i])); }
/** média geral do grupo no ciclo */
export function mediaGrupo(grupo){ return media(grupo.itens.flatMap(f => f.notas)); }
export const grupoBem = id => S.bemestar.find(g => g.id === id);
export const fmt1 = v => v === null ? '—' : (Math.round(v * 10) / 10).toString().replace('.', ',');

/** cor semafórica das notas 1–10 */
export function corNota(n){
  if (!n) return 'var(--s300)';
  if (n >= 8) return '#7C9A82';
  if (n >= 6) return '#B99150';
  return '#C87A7A';
}
export function progressoPlano(){
  if (!S.metas.length) return 0;
  const p = S.metas.reduce((acc,m) => {
    let v = 0;
    if (m.titulo.trim()) v += .25;
    if (m.indicador.trim() && String(m.alvo).trim()) v += .3;
    if (m.acoes.length) v += .25;
    if (m.contingencia.trim()) v += .2;
    return acc + v;
  }, 0);
  return Math.round(p / S.metas.length * 100);
}
export function mesLabel(){
  const [ano, mes] = S.mes.split('-');
  const n = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return n[+mes - 1] ? n[+mes - 1] + ' ' + ano : S.mes;
}
export const iniciais = () => S.aluna.trim().split(/\s+/).slice(0,2).map(p => (p[0]||'').toUpperCase()).join('');

