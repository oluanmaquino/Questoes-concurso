// LISTA DE DISCIPLINAS CADASTRADAS NO SISTEMA
const DISCIPLINAS_DISPONIVEIS = [
  { id: 'portugues', nome: 'Língua Portuguesa', svg: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5V4.5Z"/><path d="M5 4.5V21.5"/><path d="M9 7h7M9 10.5h7M9 14h5"/>' },
  { id: 'direito', nome: 'Noções de Direito', svg: '<path d="M12 4v13"/><path d="M5 7h14"/><path d="M4 7l-3 6a4 4 0 0 0 6 0L4 7Z"/><path d="M20 7l-3 6a4 4 0 0 0 6 0l-3-6Z"/><path d="M8 20h8"/><path d="M10 17h4"/>' },
  { id: 'informatica', nome: 'Informática', svg: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M6.5 6.5h11"/>' },
  { id: 'matematica', nome: 'Matemática', svg: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6.5h8"/><path d="M8 10.5h2M12 10.5h2M16 10.5h0M8 14h2M12 14h2M16 14h0M8 17.5h2M12 17.5h2M16 17.5h0"/>' }
];

let pastaDisciplinaAtual = "";
let nomeDisciplinaAtual = "";
let listaArquivosAssuntos = [];
let bancoQuestoes = [];

let paginaAtual = 1;
const QUESTOES_POR_PAGINA = 10;

let respostasUsuario = {};
let totalRespondidas = 0;
let totalAcertos = 0;

const SVG_TESOURA = `
  <svg viewBox="0 0 24 24">
    <path d="M5.5,7A2.5,2.5 0 0,0 3,9.5A2.5,2.5 0 0,0 5.5,12A2.5,2.5 0 0,0 8,9.5A2.5,2.5 0 0,0 5.5,7M5.5,8.5A1,1 0 0,1 6.5,9.5A1,1 0 0,1 5.5,10.5A1,1 0 0,1 4.5,9.5A1,1 0 0,1 5.5,8.5M9.64,7.64C9.87,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.87 7.64,9.64L10,12L7.64,14.36C7.14,14.13 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.87,16.86 9.64,16.36L12,14L19,21H22V20L9.64,7.64M6,16A2,2 0 0,1 8,18A2,2 0 0,1 6,20A2,2 0 0,1 4,18A2,2 0 0,1 6,16M12,10L19,3H22V4L12,10Z"/>
  </svg>
`;

function formatarTexto(texto) {
  if (!texto) return '';
  return texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

/* ROTEAMENTO DE TELAS */
function abrirModuloQuestoes() {
  const container = document.getElementById('grid-disciplinas-questoes');
  container.innerHTML = '';

  DISCIPLINAS_DISPONIVEIS.forEach(disc => {
    const btn = document.createElement('button');
    btn.className = 'btn-discipline';
    btn.onclick = () => abrirFiltroDisciplina(disc.id, disc.nome);
    btn.innerHTML = `
      <div class="disc-content">
        <span class="disc-icon"><svg viewBox="0 0 24 24">${disc.svg}</svg></span>
        <span>${disc.nome}</span>
      </div>
      ➔
    `;
    container.appendChild(btn);
  });

  document.getElementById('tela-hub').style.display = 'none';
  document.getElementById('tela-selecao-questoes').style.display = 'block';
}

function abrirModuloSimulado() {
  const container = document.getElementById('simulado-config-container');
  container.innerHTML = '';

  DISCIPLINAS_DISPONIVEIS.forEach(disc => {
    const item = document.createElement('div');
    item.className = 'simulado-item';
    item.innerHTML = `
      <div class="simulado-info">
        <input type="checkbox" id="chk-sim-${disc.id}" class="chk-simulado-disc" onchange="toggleSimuladoInput('${disc.id}')">
        <label for="chk-sim-${disc.id}" style="font-weight: 700; cursor: pointer;">${disc.nome}</label>
      </div>
      <div>
        <input type="number" id="input-qty-${disc.id}" class="simulado-qty-input" value="5" min="1" max="100" disabled>
        <span style="font-size: 0.8rem; color: var(--text-muted);">questões</span>
      </div>
    `;
    container.appendChild(item);
  });

  document.getElementById('tela-hub').style.display = 'none';
  document.getElementById('tela-config-simulado').style.display = 'block';
}

function toggleSimuladoInput(discId) {
  const chk = document.getElementById(`chk-sim-${discId}`);
  const input = document.getElementById(`input-qty-${discId}`);
  input.disabled = !chk.checked;
}

function voltarParaHub() {
  document.getElementById('dashboard-stats').style.display = 'none';
  document.getElementById('tela-selecao-questoes').style.display = 'none';
  document.getElementById('tela-config-simulado').style.display = 'none';
  document.getElementById('tela-filtro').style.display = 'none';
  document.getElementById('tela-quiz').style.display = 'none';
  document.getElementById('bg-imagem').style.opacity = '1';
  document.getElementById('tela-hub').style.display = 'block';
}

function voltarParaSelecaoQuestoes() {
  document.getElementById('tela-filtro').style.display = 'none';
  document.getElementById('tela-selecao-questoes').style.display = 'block';
}

/* BUSCA AUTOMÁTICA DE ARQUIVOS COM MESMO PREFIXO */
async function carregarTodosArquivosDoAssunto(pasta, prefixo, nomeAssunto, nomeMateria) {
  let questoesDoAssunto = [];

  // 1. Tenta carregar o arquivo base (ex: porcentagem.txt)
  try {
    const respBase = await fetch(`questoes/${pasta}/${prefixo}.txt`);
    if (respBase.ok) {
      const texto = await respBase.text();
      questoesDoAssunto.push(...parseTXT(texto, nomeAssunto, nomeMateria));
    }
  } catch (e) {}

  // 2. Tenta em sequência: porcentagem1.txt, porcentagem2.txt, porcentagem3.txt...
  let num = 1;
  while (num <= 50) { // Limite máximo de segurança de 50 arquivos por assunto
    try {
      const resp = await fetch(`questoes/${pasta}/${prefixo}${num}.txt`);
      if (!resp.ok) break; // Quando o arquivo não for encontrado (404), interrompe a busca

      const texto = await resp.text();
      questoesDoAssunto.push(...parseTXT(texto, nomeAssunto, nomeMateria));
      num++;
    } catch (e) {
      break;
    }
  }

  return questoesDoAssunto;
}

/* CARREGAMENTO DE ASSUNTOS DA DISCIPLINA */
async function abrirFiltroDisciplina(pasta, nomeExibicao) {
  pastaDisciplinaAtual = pasta;
  nomeDisciplinaAtual = nomeExibicao;

  document.getElementById('filtro-titulo-materia').textContent = nomeExibicao;

  try {
    const respLista = await fetch(`questoes/${pasta}/lista.json`);
    if (!respLista.ok) throw new Error("Não foi possível carregar a lista de assuntos desta matéria.");

    const textoJson = await respLista.text();
    if (!textoJson.trim()) throw new Error("O arquivo 'lista.json' está vazio.");
    
    listaArquivosAssuntos = JSON.parse(textoJson);

    const container = document.getElementById('filter-options-container');
    container.innerHTML = '';

    const itemTodos = document.createElement('label');
    itemTodos.className = 'filter-item';
    itemTodos.innerHTML = `
      <input type="checkbox" id="chk-todos" checked onchange="toggleTodosAssuntos(this)">
      <strong>Todos os Assuntos</strong>
    `;
    container.appendChild(itemTodos);

    listaArquivosAssuntos.forEach(item => {
      const prefixo = typeof item === 'object' ? (item.prefixo || item.arquivo?.replace('.txt', '')) : item.replace('.txt', '');
      const nomeAssunto = typeof item === 'object' ? (item.nome || prefixo) : prefixo;

      const el = document.createElement('label');
      el.className = 'filter-item';
      el.innerHTML = `
        <input type="checkbox" class="chk-assunto" value="${prefixo}" data-nome="${nomeAssunto}" checked onchange="verificarSelecaoFiltros()">
        <span>${nomeAssunto}</span>
      `;
      container.appendChild(el);
    });

    document.getElementById('tela-selecao-questoes').style.display = 'none';
    document.getElementById('tela-filtro').style.display = 'block';

  } catch (err) {
    alert("Atenção: " + err.message + "\n\nVerifique se o arquivo 'lista.json' existe na pasta 'questoes/" + pasta + "'.");
  }
}

function toggleTodosAssuntos(mainChk) {
  const chks = document.querySelectorAll('.chk-assunto');
  chks.forEach(c => c.checked = mainChk.checked);
}

function verificarSelecaoFiltros() {
  const chks = document.querySelectorAll('.chk-assunto');
  const todosMarcados = Array.from(chks).every(c => c.checked);
  document.getElementById('chk-todos').checked = todosMarcados;
}

/* MÓDULO 1: INICIAR MODO QUESTÕES */
async function iniciarQuizComFiltro() {
  const chks = document.querySelectorAll('.chk-assunto:checked');
  if (chks.length === 0) {
    alert("Selecione pelo menos um assunto para continuar!");
    return;
  }

  resetarEstadoGeral();
  exibirTelaCarregamento();

  try {
    let idGlobal = 0;
    for (const chk of chks) {
      const prefixo = chk.value;
      const assuntoNome = chk.dataset.nome || prefixo;

      const questoesDoAssunto = await carregarTodosArquivosDoAssunto(
        pastaDisciplinaAtual,
        prefixo,
        assuntoNome,
        nomeDisciplinaAtual
      );

      questoesDoAssunto.forEach(q => {
        idGlobal++;
        q.globalId = idGlobal;
        bancoQuestoes.push(q);
        respostasUsuario[idGlobal] = { selecionada: null, respondida: false, riscadas: [] };
      });
    }

    if (bancoQuestoes.length > 0) {
      embaralharArray(bancoQuestoes);
      exibirFeed('MODO QUESTÕES // ' + nomeDisciplinaAtual.toUpperCase());
    } else {
      alert("Nenhuma questão encontrada nos arquivos selecionados.");
      voltarParaHub();
    }
  } catch (err) {
    alert("Erro ao carregar questões: " + err.message);
    voltarParaHub();
  }
}

/* MÓDULO 2: GERAR SIMULADO CUSTOMIZADO */
async function gerarSimuladoCustomizado() {
  const chks = document.querySelectorAll('.chk-simulado-disc:checked');
  if (chks.length === 0) {
    alert("Selecione pelo menos uma disciplina para o simulado!");
    return;
  }

  resetarEstadoGeral();
  exibirTelaCarregamento();

  let idGlobal = 0;

  try {
    for (const chk of chks) {
      const discId = chk.id.replace('chk-sim-', '');
      const discInfo = DISCIPLINAS_DISPONIVEIS.find(d => d.id === discId);
      const qtdDesejada = parseInt(document.getElementById(`input-qty-${discId}`).value) || 5;

      const respLista = await fetch(`questoes/${discId}/lista.json`);
      if (respLista.ok) {
        const textoJson = await respLista.text();
        if (!textoJson.trim()) continue;

        const assuntos = JSON.parse(textoJson);
        let questoesDaMateria = [];

        for (const item of assuntos) {
          const prefixo = typeof item === 'object' ? (item.prefixo || item.arquivo?.replace('.txt', '')) : item.replace('.txt', '');
          const nomeAssunto = typeof item === 'object' ? (item.nome || prefixo) : prefixo;

          const questoesAssunto = await carregarTodosArquivosDoAssunto(discId, prefixo, nomeAssunto, discInfo.nome);
          questoesDaMateria.push(...questoesAssunto);
        }

        if (questoesDaMateria.length > 0) {
          let questoesSelecionadas = selecionarQuestoesParaSimulado(questoesDaMateria, qtdDesejada);

          questoesSelecionadas.forEach(q => {
            idGlobal++;
            const questaoCopia = { ...q, globalId: idGlobal };
            bancoQuestoes.push(questaoCopia);
            respostasUsuario[idGlobal] = { selecionada: null, respondida: false, riscadas: [] };
          });
        }
      }
    }

    if (bancoQuestoes.length > 0) {
      embaralharArray(bancoQuestoes);
      exibirFeed('SIMULADO PERSONALIZADO (' + bancoQuestoes.length + ' QUESTÕES)');
    } else {
      alert("Não foi possível carregar questões para as matérias selecionadas.");
      voltarParaHub();
    }

  } catch (err) {
    alert("Erro ao montar simulado: " + err.message);
    voltarParaHub();
  }
}

/* REGRA: SELECIONAR QUESTÕES SEM OU COM REPETIÇÃO */
function selecionarQuestoesParaSimulado(questoesDisponiveis, qtdDesejada) {
  let resultado = [];
  let copiasDisponiveis = [...questoesDisponiveis];
  embaralharArray(copiasDisponiveis);

  if (copiasDisponiveis.length >= qtdDesejada) {
    return copiasDisponiveis.slice(0, qtdDesejada);
  }

  resultado = [...copiasDisponiveis];
  let faltantes = qtdDesejada - resultado.length;

  for (let i = 0; i < faltantes; i++) {
    const indiceSorteado = Math.floor(Math.random() * questoesDisponiveis.length);
    resultado.push(questoesDisponiveis[indiceSorteado]);
  }

  return resultado;
}

function resetarEstadoGeral() {
  bancoQuestoes = [];
  respostasUsuario = {};
  totalRespondidas = 0;
  totalAcertos = 0;
  paginaAtual = 1;
  atualizarEstatisticas();
}

function exibirTelaCarregamento() {
  document.getElementById('tela-selecao-questoes').style.display = 'none';
  document.getElementById('tela-config-simulado').style.display = 'none';
  document.getElementById('tela-filtro').style.display = 'none';
  document.getElementById('bg-imagem').style.opacity = '0';
  document.getElementById('tela-quiz').style.display = 'block';
  document.getElementById('loading-spinner').style.display = 'block';
  document.getElementById('quiz-content').style.display = 'none';
}

function exibirFeed(tituloTag) {
  setTimeout(() => {
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('quiz-content').style.display = 'block';
    document.getElementById('dashboard-stats').style.display = 'flex';
    document.getElementById('feed-materia-tag').textContent = tituloTag;
    renderizarPagina();
  }, 700);
}

function embaralharArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function parseTXT(texto, assunto, nomeMateria) {
  const blocos = texto.split('---').map(b => b.trim()).filter(b => b.length > 0);
  const mapaLetras = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };

  return blocos.map(bloco => {
    const linhas = bloco.split('\n');
    let enunciado = "";
    let alternativas = [];
    let correta = 0;
    let explicacao = "Sem explicação cadastrada.";
    let chaveAtual = "";

    linhas.forEach(linha => {
      const l = linha.trim();
      if (l.startsWith('ENUNCIADO:')) {
        chaveAtual = 'enunciado';
        enunciado = l.replace('ENUNCIADO:', '').trim();
      } else if (l.match(/^[A-E]\)/)) {
        chaveAtual = 'alternativa';
        alternativas.push(l.replace(/^[A-E]\)/, '').trim());
      } else if (l.startsWith('CORRETA:')) {
        chaveAtual = 'correta';
        const letra = l.replace('CORRETA:', '').trim().toUpperCase();
        correta = mapaLetras[letra] !== undefined ? mapaLetras[letra] : 0;
      } else if (l.startsWith('EXPLICACAO:')) {
        chaveAtual = 'explicacao';
        explicacao = l.replace('EXPLICACAO:', '').trim();
      } else if (l.length > 0) {
        if (chaveAtual === 'enunciado') enunciado += '<br>' + l;
        else if (chaveAtual === 'explicacao') explicacao += '<br>' + l;
      }
    });

    return { disciplina: nomeMateria, assunto, enunciado, alternativas, correta, explicacao };
  });
}

function renderizarPagina() {
  const container = document.getElementById('questoes-feed-container');
  container.innerHTML = '';

  const totalPaginas = Math.ceil(bancoQuestoes.length / QUESTOES_POR_PAGINA);
  const inicio = (paginaAtual - 1) * QUESTOES_POR_PAGINA;
  const fim = Math.min(inicio + QUESTOES_POR_PAGINA, bancoQuestoes.length);

  const questoesDaPagina = bancoQuestoes.slice(inicio, fim);

  questoesDaPagina.forEach((q, index) => {
    const numeroGlobal = inicio + index + 1;
    const estado = respostasUsuario[q.globalId];
    const letras = ['A', 'B', 'C', 'D', 'E'];

    const qCard = document.createElement('div');
    qCard.className = 'questao-card';
    qCard.id = `card-q-${q.globalId}`;

    let htmlAlternativas = '';
    q.alternativas.forEach((alt, idx) => {
      const foiRiscada = estado.riscadas.includes(idx);
      const foiSelecionada = estado.selecionada === idx;

      let classeOpt = 'option-item';
      if (foiRiscada) classeOpt += ' struck';
      if (foiSelecionada) classeOpt += ' selected';

      if (estado.respondida) {
        classeOpt += ' disabled';
        if (idx === q.correta) classeOpt += ' correct';
        else if (foiSelecionada && foiSelecionada !== q.correta) classeOpt += ' incorrect';
      }

      htmlAlternativas += `
        <div class="${classeOpt}" id="opt-${q.globalId}-${idx}">
          <div class="letter-box">${letras[idx]}</div>
          <div class="option-text" onclick="selecionarOpcao(${q.globalId}, ${idx})">${formatarTexto(alt)}</div>
          <button class="btn-tesoura" onclick="toggleRiscar(event, ${q.globalId}, ${idx})" title="Eliminar alternativa">
            ${SVG_TESOURA}
          </button>
        </div>
      `;
    });

    qCard.innerHTML = `
      <div class="questao-meta">${q.disciplina.toUpperCase()} // ${q.assunto.toUpperCase()} // Q${numeroGlobal} DE ${bancoQuestoes.length}</div>
      <div class="enunciado">${formatarTexto(q.enunciado)}</div>
      <div class="options-list">${htmlAlternativas}</div>
      <div class="feedback-banner" id="feedback-${q.globalId}"></div>
      <div class="q-actions">
        <button class="btn btn-primary" id="btn-conf-${q.globalId}" onclick="conferirResposta(${q.globalId})" ${estado.respondida ? 'style="display:none;"' : ''}>
          Conferir Resposta
        </button>
      </div>
    `;

    container.appendChild(qCard);

    if (estado.respondida) {
      exibirFeedbackSalvo(q);
    }
  });

  document.getElementById('page-info').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  document.getElementById('btn-page-prev').style.visibility = paginaAtual === 1 ? 'hidden' : 'visible';
  document.getElementById('btn-page-next').style.visibility = paginaAtual === totalPaginas ? 'hidden' : 'visible';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selecionarOpcao(globalId, idx) {
  const estado = respostasUsuario[globalId];
  if (estado.respondida) return;

  estado.selecionada = idx;

  const posRisco = estado.riscadas.indexOf(idx);
  if (posRisco > -1) estado.riscadas.splice(posRisco, 1);

  const card = document.getElementById(`card-q-${globalId}`);
  const opts = card.querySelectorAll('.option-item');
  opts.forEach((opt, index) => {
    opt.classList.remove('selected');
    if (estado.riscadas.includes(index)) opt.classList.add('struck');
    else opt.classList.remove('struck');
  });

  document.getElementById(`opt-${globalId}-${idx}`).classList.add('selected');
}

function toggleRiscar(event, globalId, idx) {
  event.stopPropagation();
  const estado = respostasUsuario[globalId];
  if (estado.respondida) return;

  const pos = estado.riscadas.indexOf(idx);
  if (pos > -1) {
    estado.riscadas.splice(pos, 1);
  } else {
    estado.riscadas.push(idx);
    if (estado.selecionada === idx) estado.selecionada = null;
  }

  const opt = document.getElementById(`opt-${globalId}-${idx}`);
  opt.classList.toggle('struck');
  opt.classList.remove('selected');
}

function conferirResposta(globalId) {
  const estado = respostasUsuario[globalId];
  if (estado.selecionada === null) {
    alert("Por favor, selecione uma alternativa antes de conferir!");
    return;
  }

  const q = bancoQuestoes.find(item => item.globalId === globalId);
  estado.respondida = true;

  totalRespondidas++;
  if (estado.selecionada === q.correta) totalAcertos++;

  atualizarEstatisticas();

  const optSelecionada = document.getElementById(`opt-${globalId}-${estado.selecionada}`);
  const optCorreta = document.getElementById(`opt-${globalId}-${q.correta}`);

  if (estado.selecionada === q.correta) {
    optSelecionada.classList.add('correct');
  } else {
    optSelecionada.classList.add('incorrect');
    optCorreta.classList.add('correct');
  }

  document.getElementById(`btn-conf-${globalId}`).style.display = 'none';
  exibirFeedbackSalvo(q);
}

function exibirFeedbackSalvo(q) {
  const estado = respostasUsuario[q.globalId];
  const feedbackEl = document.getElementById(`feedback-${q.globalId}`);

  if (estado.selecionada === q.correta) {
    feedbackEl.className = 'feedback-banner success';
    feedbackEl.innerHTML = `<strong>✅ Resposta Correta!</strong><br>${formatarTexto(q.explicacao)}`;
  } else {
    feedbackEl.className = 'feedback-banner error';
    feedbackEl.innerHTML = `<strong>❌ Resposta Incorreta.</strong><br>${formatarTexto(q.explicacao)}`;
  }
}

function mudarPagina(delta) {
  paginaAtual += delta;
  renderizarPagina();
}

function atualizarEstatisticas() {
  document.getElementById('stat-total').textContent = totalRespondidas;
  document.getElementById('stat-acertos').textContent = totalAcertos;
  const pct = totalRespondidas > 0 ? ((totalAcertos / totalRespondidas) * 100).toFixed(0) : 0;
  document.getElementById('stat-pct').textContent = `${pct}%`;
}