/* ================================================================== *
 *  ÍCONES (inline, sem dependência externa)
 * ================================================================== */
export const ICO = {
  dumbbell:'<path d="M14.4 14.4 9.6 9.6M18.657 21.485l2.828-2.829M2.686 5.514l2.828-2.829M6.343 21.485l-3.828-3.828a2 2 0 0 1 0-2.829l2.828-2.828 6.657 6.657-2.828 2.828a2 2 0 0 1-2.829 0ZM17.657 12.343l3.828-3.828a2 2 0 0 0 0-2.829l-2.828-2.828-6.657 6.657 2.828 2.828a2 2 0 0 0 2.829 0Z"/>',
  activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  utensils:'<path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-3 4.5v6.5h3Zm0 0v7"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  brain:'<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Zm0 0a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  trash:'<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  circle:'<circle cx="12" cy="12" r="9"/>',
  circleDot:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
  circleCheck:'<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>'
};
export const svg = (name, size = 16, sw = 1.8) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICO[name]}</svg>`;

/* ================================================================== *
 *  TAXONOMIA DAS MICRO-METAS
 * ================================================================== */
export const CATEGORIAS = {
  treino:   { label:'Treino',              icon:'dumbbell', cor:'#E8B4B8' },
  cardio:   { label:'Cardio',              icon:'activity', cor:'#A8BFA5' },
  nutricao: { label:'Nutrição',            icon:'utensils', cor:'#DCC7AA' },
  sono:     { label:'Sono & Recuperação',  icon:'moon',     cor:'#A9BDD1' },
  mental:   { label:'Mentalidade',         icon:'brain',    cor:'#C3B5D9' }
};
export const PRIORIDADES = {
  alta:  { label:'Alta',  cor:'#C87A7A', bg:'rgba(200,122,122,.12)' },
  media: { label:'Média', cor:'#B99150', bg:'rgba(185,145,80,.12)'  },
  baixa: { label:'Baixa', cor:'#7C9A82', bg:'rgba(124,154,130,.12)' }
};
export const STATUS = {
  planejada: { label:'Planejada',    icon:'circle',      cor:'#A8A29E' },
  andamento: { label:'Em andamento', icon:'circleDot',   cor:'#B99150' },
  concluida: { label:'Concluída',    icon:'circleCheck', cor:'#7C9A82' }
};

let _uid = 0;
export const uid = () => 'id' + (Date.now().toString(36)) + (_uid++);
export const acoes = (...t) => t.map(texto => ({ id: uid(), texto, feito:false }));

export function metasPadrao(){ return [
  { id:uid(), semana:'Semana 1', titulo:'Consistência e Registro', categoria:'treino', prioridade:'alta', status:'planejada',
    detalhe:'A base do ciclo é presença e dado confiável. Sem registro, não há como ajustar carga com segurança na semana seguinte.',
    indicador:'Treinos registrados no app', alvo:'5', unidade:'sessões/sem',
    contingencia:'Se o dia apertar: treino curto de 30 min com os 3 exercícios principais. Presença vale mais que volume.',
    acoes:acoes('Registrar carga e repetições de todos os exercícios','Anotar percepção de esforço (PSE 1–10) ao final da sessão','Deixar a mochila pronta na noite anterior') },
  { id:uid(), semana:'Semana 2', titulo:'Progressão de Cargas', categoria:'treino', prioridade:'alta', status:'planejada',
    detalhe:'Com o registro em dia, subimos carga nos exercícios base mantendo técnica e amplitude completa.',
    indicador:'Aumento nos exercícios base', alvo:'2,5–5', unidade:'kg',
    contingencia:'Se a técnica quebrar, mantém a carga anterior e adiciona 1–2 repetições em vez de peso.',
    acoes:acoes('Subir carga em Leg Press, Agachamento e Stiff','Gravar 1 série de agachamento para checagem de técnica','Manter 2 min de descanso nos compostos') },
  { id:uid(), semana:'Semana 3', titulo:'Adaptação de Rotina / TPM', categoria:'sono', prioridade:'media', status:'planejada',
    detalhe:'Semana historicamente mais difícil. O objetivo aqui não é performance — é não zerar. Treino de contingência liberado.',
    indicador:'Frequência mínima mantida', alvo:'3', unidade:'sessões/sem',
    contingencia:'Sessões de 35 min, volume reduzido em 30%, sem exercícios que exijam pico de força. Caminhada conta como sessão.',
    acoes:acoes('Reduzir volume mantendo os exercícios principais','Priorizar 7h de sono nas noites de treino','Avisar a consultora se a semana virar antes de faltar') },
  { id:uid(), semana:'Semana 4', titulo:'Consolidação e Avaliação', categoria:'treino', prioridade:'media', status:'planejada',
    detalhe:'Fechamento do ciclo: reteste dos exercícios base e registro visual para comparar com o mês anterior.',
    indicador:'Itens de fechamento concluídos', alvo:'100', unidade:'%',
    contingencia:'Se o reteste não for possível, mantém a carga da Semana 3 e remarca a avaliação para a primeira semana do mês seguinte.',
    acoes:acoes('Reteste de carga nos 3 exercícios base','Fotos de progresso no mesmo ângulo e iluminação','Medidas de cintura, quadril e coxa','Preencher o questionário de fechamento antes da call') }
];}

export const TEMPLATES = [
  { id:'padrao', nome:'Ciclo padrão', build: metasPadrao },
  { id:'retomada', nome:'Retomada pós-pausa', build:()=>[
    { id:uid(), semana:'Semana 1', titulo:'Reativação sem dor', categoria:'treino', prioridade:'alta', status:'planejada',
      detalhe:'Volta gradual. Carga leve, foco em reencontrar o padrão de movimento.',
      indicador:'Sessões leves', alvo:'3', unidade:'sessões/sem',
      contingencia:'Dor acima de 4/10 → interrompe a série e reduz amplitude.',
      acoes:acoes('Cargas a 60% do último ciclo','Aquecimento de 10 min obrigatório') },
    { id:uid(), semana:'Semana 2', titulo:'Reconstrução do hábito', categoria:'mental', prioridade:'alta', status:'planejada',
      detalhe:'O gargalo aqui é rotina, não capacidade física.',
      indicador:'Treinos no horário planejado', alvo:'4', unidade:'sessões/sem',
      contingencia:'Horário fixo na agenda; se perder, treino de 20 min em casa.',
      acoes:acoes('Definir horário fixo dos treinos','Check-in semanal com a consultora') },
    { id:uid(), semana:'Semana 3', titulo:'Retomada de carga', categoria:'treino', prioridade:'media', status:'planejada',
      detalhe:'Voltar progressivamente ao patamar anterior à pausa.',
      indicador:'Carga vs. pré-pausa', alvo:'85', unidade:'%',
      contingencia:'Priorizar amplitude sobre peso.',
      acoes:acoes('Subir carga nos compostos','Revisar técnica em vídeo') },
    { id:uid(), semana:'Semana 4', titulo:'Novo ponto de partida', categoria:'treino', prioridade:'media', status:'planejada',
      detalhe:'Estabelecer as referências do próximo ciclo completo.',
      indicador:'Reteste concluído', alvo:'100', unidade:'%',
      contingencia:'Remarcar reteste se houver dor ativa.',
      acoes:acoes('Reteste dos exercícios base','Fotos e medidas') }
  ]},
  { id:'hipertrofia', nome:'Foco em hipertrofia', build:()=>[
    { id:uid(), semana:'Semana 1', titulo:'Volume base', categoria:'treino', prioridade:'alta', status:'planejada',
      detalhe:'Estabelecer o volume semanal por grupo muscular.',
      indicador:'Séries por grupo', alvo:'12', unidade:'séries/sem',
      contingencia:'Cortar acessórios antes de cortar compostos.',
      acoes:acoes('Registrar séries por grupo','Manter RIR 2–3') },
    { id:uid(), semana:'Semana 2', titulo:'Sobrecarga progressiva', categoria:'treino', prioridade:'alta', status:'planejada',
      detalhe:'Aumentar carga ou repetições em todos os compostos.',
      indicador:'Exercícios com progressão', alvo:'80', unidade:'%',
      contingencia:'Se estagnar, trocar a variação do exercício.',
      acoes:acoes('Subir carga nos compostos','Levar RIR para 1–2 na última série') },
    { id:uid(), semana:'Semana 3', titulo:'Suporte nutricional', categoria:'nutricao', prioridade:'alta', status:'planejada',
      detalhe:'Sem proteína e caloria suficientes, o estímulo não vira resultado.',
      indicador:'Proteína diária', alvo:'1,8', unidade:'g/kg',
      contingencia:'Whey ou iogurte grego cobrem a lacuna nos dias corridos.',
      acoes:acoes('Registrar proteína por 5 dias','Refeição sólida até 2h pós-treino') },
    { id:uid(), semana:'Semana 4', titulo:'Deload e avaliação', categoria:'sono', prioridade:'media', status:'planejada',
      detalhe:'Reduzir volume para permitir supercompensação antes do próximo bloco.',
      indicador:'Redução de volume', alvo:'40', unidade:'%',
      contingencia:'Manter a intensidade, cortar as séries.',
      acoes:acoes('Cortar 40% das séries','Priorizar 8h de sono','Fotos e medidas') }
  ]}
];

/* ================================================================== *
 *  ESTADO
 * ================================================================== */
export const IMPACTOS = {
  baixo: { label:'Baixo', cor:'#7C9A82', bg:'rgba(124,154,130,.14)' },
  medio: { label:'Médio', cor:'#B99150', bg:'rgba(185,145,80,.14)'  },
  alto:  { label:'Alto',  cor:'#C87A7A', bg:'rgba(200,122,122,.14)' }
};
export const CONDUTAS = ['Substituir exercício','Reduzir amplitude','Reduzir carga',
                  'Ajustar pegada / apoio','Manter e observar'];

export function novoFator(label, ativo = false){
  return { id:uid(), label, ativo, impacto:'medio', semanas:[false,false,false,false] };
}
export function fatoresPadrao(){
  return [
    novoFator('Rotina de trabalho / estudos'),
    novoFator('Ciclo menstrual / TPM', true),
    novoFator('Cansaço / sono', true),
    novoFator('Viagem'),
    novoFator('Motivação'),
    novoFator('Dor ou desconforto'),
    novoFator('Custo / deslocamento até a academia')
  ];
}
export function novoDesconforto(exercicio = '', regiao = ''){
  return { id:uid(), exercicio, regiao, dor:null, conduta:CONDUTAS[0], ajuste:'' };
}
export const ALERTAS = [
  { id:'a1', label:'Dor que persiste mais de 48h após o treino' },
  { id:'a2', label:'Dor em repouso ou que acorda à noite' },
  { id:'a3', label:'Formigamento ou perda de força' },
  { id:'a4', label:'Inchaço ou travamento articular' },
  { id:'a5', label:'Tontura ou falta de ar desproporcional ao esforço' }
];

/* ---- progressão de carga: sessões datadas + exercícios por grupo ---- */
export const PALETA = ['#E8B4B8','#A8BFA5','#A9BDD1','#DCC7AA','#C3B5D9','#C89F9C','#8FA8B8'];
export const proxCor = lista => PALETA[lista.length % PALETA.length];

export function ex(nome, cor, ...vals){
  return { id:uid(), nome, cor, cargas:vals };
}
export function progPadrao(){
  return {
    ativo:'inferiores',
    sessoes:[
      { id:uid(), data:'2026-08-03' },
      { id:uid(), data:'2026-08-10' },
      { id:uid(), data:'2026-08-17' },
      { id:uid(), data:'2026-08-24' }
    ],
    grupos:{
      inferiores:{ label:'Inferiores', exercicios:[
        ex('Leg Press',    '#E8B4B8', 100, 110, 115, 125),
        ex('Agachamento',  '#A8BFA5',  40,  44,  46,  50),
        ex('Stiff',        '#A9BDD1',  35,  38,  40,  44)
      ]},
      superiores:{ label:'Superiores', exercicios:[
        ex('Supino reto',      '#DCC7AA', 20, 22, 24, 26),
        ex('Remada curvada',   '#C3B5D9', 25, 27, 30, 32),
        ex('Desenvolvimento',  '#C89F9C', 12, 14, 14, 16)
      ]}
    }
  };
}
export const grupoAtivo = () => S.prog.grupos[S.prog.ativo];
export const todosExercicios = () => Object.values(S.prog.grupos).flatMap(g => g.exercicios);

/** "2026-08-03" → "03/08" ; vazio → "Sessão n" */
export function labelSessao(s, i){
  if (!s.data) return 'Sessão ' + (i + 1);
  const [, m, d] = s.data.split('-');
  return `${d}/${m}`;
}

/* ---- bem-estar: sub-fatores avaliados semana a semana (10 = melhor) ---- */
export function fator(label, ...notas){ return { id:uid(), label, notas }; }
export function bemEstarPadrao(){
  return [
    { id:'disposicao', label:'Disposição', cor:'#DCC7AA', itens:[
      fator('Energia',    8, 8, 6, 9),
      fator('Humor',      8, 7, 6, 8),
      fator('Motivação',  9, 8, 6, 8)
    ]},
    { id:'recuperacao', label:'Recuperação', cor:'#A9BDD1', itens:[
      fator('Qualidade do sono',   7, 7, 5, 8),
      fator('Conforto muscular',   8, 6, 6, 7),
      fator('Prontidão p/ treinar', 8, 7, 5, 8)
    ]}
  ];
}

export const S = {
  aluna:'Mariana Costa', mes:'2026-08',
  previstos:20, realizados:17,
  bemestar: bemEstarPadrao(),
  metaProgressao: 10,
  semanas:[
    { nome:'Semana 1', previsto:5, realizado:5 },
    { nome:'Semana 2', previsto:5, realizado:4 },
    { nome:'Semana 3', previsto:5, realizado:3 },
    { nome:'Semana 4', previsto:5, realizado:5 }
  ],
  prog: progPadrao(),
  pilares:[
    { nome:'Treino', valor:85, cor:'#E8B4B8' },
    { nome:'Cardio', valor:70, cor:'#A8BFA5' },
    { nome:'Sono',   valor:78, cor:'#A9BDD1' },
    { nome:'Nutrição', valor:90, cor:'#DCC7AA' },
    { nome:'Hidratação', valor:0, cor:'#8FA8B8', auto:true },
    { nome:'Autocuidado e lazer', valor:45, cor:'#C3B5D9' }
  ],
  /* consumo médio de água por dia, em litros, em cada semana */
  hidratacao:{ meta:2.5, peso:null, semanas:[2.2, 2.4, 1.7, 2.6], obs:'' },
  /* o que ela fez por si além do treino */
  lazer:[
    { id:uid(), texto:'Terminou o livro que tinha começado', feito:true },
    { id:uid(), texto:'Fez as unhas / skincare', feito:true },
    { id:uid(), texto:'Cozinhou uma receita nova', feito:false },
    { id:uid(), texto:'Passeio ao ar livre sem ser treino', feito:false }
  ],
  fatores: fatoresPadrao(),
  desconfortos:[ novoDesconforto('Agachamento livre','Joelho direito') ],
  alertas:{},
  encaminhamento:'',
  obs:'',
  email:'',
  metas: metasPadrao(),
  aberta: null,
  concluida:false
};

export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

