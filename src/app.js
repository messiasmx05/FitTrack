/* ==========================================
   FitTrack — lógica principal da aplicação.
   Os dados do usuário autenticado são carregados da API do servidor.
   ========================================== */

import Chart from 'chart.js/auto';
import { createAuthModal } from './components/AuthModal.js';
import {
  checkAuthenticatedUser,
  logoutUser,
} from './services/auth.js';
import { getUserData, saveUserData } from './services/userData.js';
import {
  exportData as createBackupBlob,
  importData as readBackupFile,
  normalizeData,
} from './data/storage.js';
import {
  DAY_NAMES,
  MONTH_NAMES,
  EXERCISE_SUGGESTIONS,
  EXERCISE_LIBRARY,
  MUSCLE_GROUPS,
  getMuscleBadgeHtml,
  DEFAULT_DATA,
} from './utils/constants.js';
import { escapeHtml, formatDateFile, generateId, playFinishSound } from './utils/dom.js';
import { createTimer } from './components/Timer.js';

// Estado principal compartilhado pelas telas: rotina semanal e histórico.
let appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
let authenticatedUser = null;
let authModal = null;
let appInitialized = false;
let saveTimer = null;
let pendingSnapshot = null;
let saveQueue = Promise.resolve();
let saveFailure = null;

// Salva alterações com debounce para evitar uma requisição por tecla digitada.
function saveData() {
  if (!authenticatedUser) return;
  pendingSnapshot = JSON.parse(JSON.stringify(appData));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistPendingSnapshot().catch(() => {});
  }, 400);
}

function persistPendingSnapshot() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!pendingSnapshot) {
    return saveQueue.then(() => {
      if (saveFailure) {
        throw new Error('Não foi possível salvar os dados pendentes. Verifique sua conexão antes de sair.');
      }
    });
  }
  const snapshot = pendingSnapshot;
  pendingSnapshot = null;
  saveQueue = saveQueue
    .then(() => saveUserData(snapshot))
    .then(() => {
      saveFailure = null;
    })
    .catch(error => {
      saveFailure = error;
      if (!pendingSnapshot) pendingSnapshot = snapshot;
      console.error('Erro ao salvar os dados da conta:', error);
      showToast('Não foi possível salvar seus dados. Verifique sua conexão com a internet.', 'error');
    });
  return saveQueue.then(() => {
    if (saveFailure) {
      throw new Error('Não foi possível salvar os dados pendentes. Verifique sua conexão antes de sair.');
    }
  });
}

// Atalhos para buscar um elemento ou uma coleção de elementos no HTML.
// $ retorna o primeiro resultado; $$ retorna todos os resultados.
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Referências aos elementos da página, preenchidas uma vez por cacheDOMRefs().
// Guardá-las evita repetir consultas ao documento em cada interação.
let pages, navBtns, mobileNavBtns;
let dayTabs, dayLabelInput, routineExerciseList;
let exNameInput, exSetsInput, exRepsInput, exWeightInput, exRestInput;
let btnAddExercise, exerciseSuggestions;
let workoutDaySelect, treinoSubtitle, treinoDayBadge, workoutExercises, workoutActions;
let btnFinishWorkout, treinoEmpty;
let restTimerCard, timerStatusLabel, timerSecondsDisplay, timerProgressBar;
let btnTimerMinus, btnTimerToggle, btnTimerToggleIcon, btnTimerToggleText;
let btnTimerPlus, btnTimerPlus30, btnTimerReset, btnPresets;
let floatingTimer, floatingTimerLabel, floatingTimerVal, btnFloatingToggle, btnFloatingToggleIcon, btnFloatingAdd15, btnFloatingClose;
let historyList, historicoEmpty;
let evoExerciseSelect, evoMetricSelect, statsCards, chartContainer;
let evolucaoEmpty, statRecord, statProgress, statSessions;
let modalOverlay, modal, modalTitle, modalBody, modalFooter, modalClose;
let toastContainer;
let btnExport, btnImport, importFile;
let homeDateLabel, homeGreetingTitle, homeHeroDesc, btnHomeStartWorkout, btnHomeViewRoutine;
let homeTotalWorkouts, homeTotalVolume, homeActiveRoutineDays, homeTotalExercises;
let homeRoutineSummary, homeTodaySummary, homeHistorySummary, homeEvolutionSummary;
let timer;
let btnOpenCatalog, btnInputCatalog, catalogModalOverlay, catalogModal, btnCloseCatalog;
let catalogSearchInput, catalogMuscleTabs, catalogExercisesGrid, muscleChips;
let activeMuscleFilter = 'todos';
let activeCatalogTab = 'todos';

// Conecta variáveis do JavaScript aos elementos identificados por id ou classe
// no index.html. Os dados e eventos da interface usam estas referências.
function cacheDOMRefs() {
  pages = {
    inicio: $('#page-inicio'),
    rotina: $('#page-rotina'),
    treino: $('#page-treino'),
    historico: $('#page-historico'),
    evolucao: $('#page-evolucao'),
  };

  homeDateLabel = $('#homeDateLabel');
  homeGreetingTitle = $('#homeGreetingTitle');
  homeHeroDesc = $('#homeHeroDesc');
  btnHomeStartWorkout = $('#btnHomeStartWorkout');
  btnHomeViewRoutine = $('#btnHomeViewRoutine');
  homeTotalWorkouts = $('#homeTotalWorkouts');
  homeTotalVolume = $('#homeTotalVolume');
  homeActiveRoutineDays = $('#homeActiveRoutineDays');
  homeTotalExercises = $('#homeTotalExercises');
  homeRoutineSummary = $('#homeRoutineSummary');
  homeTodaySummary = $('#homeTodaySummary');
  homeHistorySummary = $('#homeHistorySummary');
  homeEvolutionSummary = $('#homeEvolutionSummary');

  navBtns = $$('.nav-btn[data-page]');
  mobileNavBtns = $$('.mobile-nav-btn[data-page]');

  dayTabs = $$('.day-tab');
  dayLabelInput = $('#dayLabel');
  routineExerciseList = $('#routineExerciseList');
  exNameInput = $('#exName');
  exSetsInput = $('#exSets');
  exRepsInput = $('#exReps');
  exWeightInput = $('#exWeight');
  exRestInput = $('#exRest');
  btnAddExercise = $('#btnAddExercise');
  exerciseSuggestions = $('#exerciseSuggestions');

  workoutDaySelect = $('#workoutDaySelect');
  treinoSubtitle = $('#treinoSubtitle');
  treinoDayBadge = $('#treinoDayBadge');
  workoutExercises = $('#workoutExercises');
  workoutActions = $('#workoutActions');
  btnFinishWorkout = $('#btnFinishWorkout');
  treinoEmpty = $('#treinoEmpty');

  // Elementos do cronômetro principal.
  restTimerCard = $('#restTimerCard');
  timerStatusLabel = $('#timerStatusLabel');
  timerSecondsDisplay = $('#timerSecondsDisplay');
  timerProgressBar = $('#timerProgressBar');
  btnTimerMinus = $('#btnTimerMinus');
  btnTimerToggle = $('#btnTimerToggle');
  btnTimerToggleIcon = $('#btnTimerToggleIcon');
  btnTimerToggleText = $('#btnTimerToggleText');
  btnTimerPlus = $('#btnTimerPlus');
  btnTimerPlus30 = $('#btnTimerPlus30');
  btnTimerReset = $('#btnTimerReset');
  btnPresets = $$('.btn-preset');

  // Elementos do cronômetro flutuante.
  floatingTimer = $('#floatingTimer');
  floatingTimerLabel = $('#floatingTimerLabel');
  floatingTimerVal = $('#floatingTimerVal');
  btnFloatingToggle = $('#btnFloatingToggle');
  btnFloatingToggleIcon = $('#btnFloatingToggleIcon');
  btnFloatingAdd15 = $('#btnFloatingAdd15');
  btnFloatingClose = $('#btnFloatingClose');

  historyList = $('#historyList');
  historicoEmpty = $('#historicoEmpty');

  evoExerciseSelect = $('#evoExerciseSelect');
  evoMetricSelect = $('#evoMetricSelect');
  statsCards = $('#statsCards');
  chartContainer = $('#chartContainer');
  evolucaoEmpty = $('#evolucaoEmpty');
  statRecord = $('#statRecord');
  statProgress = $('#statProgress');
  statSessions = $('#statSessions');

  modalOverlay = $('#modalOverlay');
  modal = $('#modal');
  modalTitle = $('#modalTitle');
  modalBody = $('#modalBody');
  modalFooter = $('#modalFooter');
  modalClose = $('#modalClose');

  toastContainer = $('#toastContainer');

  const userProfileBadge = $('#userProfileBadge');
  const btnLogout = $('#btnLogout');
  const btnMobileLogout = $('#btnMobileLogout');
  const logout = async () => {
    try {
      await persistPendingSnapshot();
      await logoutUser();
      authenticatedUser = null;
      appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
      workoutInProgress = {};
      timer?.cancel();
      userProfileBadge.hidden = true;
      authModal.show('login');
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      showToast('Não foi possível sair da conta. Tente novamente.', 'error');
    }
  };
  btnLogout.addEventListener('click', logout);
  btnMobileLogout.addEventListener('click', logout);

  btnExport = $('#btnExport');
  btnImport = $('#btnImport');
  importFile = $('#importFile');

  // Catálogo e Filtros de Exercícios
  btnOpenCatalog = $('#btnOpenCatalog');
  btnInputCatalog = $('#btnInputCatalog');
  catalogModalOverlay = $('#catalogModalOverlay');
  catalogModal = $('#catalogModal');
  btnCloseCatalog = $('#btnCloseCatalog');
  catalogSearchInput = $('#catalogSearchInput');
  catalogMuscleTabs = $('#catalogMuscleTabs');
  catalogExercisesGrid = $('#catalogExercisesGrid');
  muscleChips = $$('#muscleChipsContainer .muscle-chip');
}

// ─── Estado temporário da interface ─────────
// selectedDay é o dia aberto na tela Rotina; activeWorkoutDay é o dia do treino.
let selectedDay = new Date().getDay();
let activeWorkoutDay = new Date().getDay();
let currentPage = 'inicio';
// Instância Chart.js atual, destruída antes de desenhar outro gráfico.
let evolutionChart = null;

// Progresso ainda não salvo do treino, separado por dia enquanto a página está aberta.
let workoutInProgress = {};

// Prepara referências e eventos e desenha a tela inicial depois que o HTML existe.
function init() {
  if (appInitialized) return;
  appInitialized = true;
  cacheDOMRefs();
  timer = createTimer({
    refs: {
      restTimerCard, timerStatusLabel, timerSecondsDisplay, timerProgressBar,
      btnTimerMinus, btnTimerToggle, btnTimerToggleIcon, btnTimerToggleText,
      btnTimerPlus, btnTimerPlus30, btnTimerReset, btnPresets,
      floatingTimer, floatingTimerLabel, floatingTimerVal,
      btnFloatingToggle, btnFloatingToggleIcon, btnFloatingAdd15, btnFloatingClose,
    },
    showToast,
    shouldShowFloatingTimer: () => currentPage !== 'treino',
  });
  populateExerciseSuggestions();
  setupNavigation();
  setupRoutinePage();
  setupTreinoPage();
  timer.setupControls();
  setupHistoricoPage();
  setupEvolucaoPage();
  setupImportExport();
  setupModal();

  // Seleciona inicialmente o dia atual na tela Rotina.
  setActiveDay(selectedDay);

  // Sincroniza o seletor de dia da tela Treino.
  if (workoutDaySelect) {
    workoutDaySelect.value = String(activeWorkoutDay);
  }

  // Desenha o estado inicial do cronômetro.
  timer.updateUI();

  // Desenha a tela inicial.
  renderInicioPage();
}

// Monta as opções do datalist juntando sugestões da biblioteca e exercícios já usados.
function populateExerciseSuggestions(muscleFilter = 'todos') {
  if (!exerciseSuggestions) return;
  exerciseSuggestions.innerHTML = '';

  let list = EXERCISE_LIBRARY;
  if (muscleFilter && muscleFilter !== 'todos') {
    list = EXERCISE_LIBRARY.filter(e => e.muscle === muscleFilter);
  }

  const allNames = new Set(list.map(e => e.name));
  for (const dayKey in appData.routine) {
    const dayExercises = appData.routine[dayKey].exercises;
    if (Array.isArray(dayExercises)) {
      for (const ex of dayExercises) {
        allNames.add(ex.name);
      }
    }
  }
  for (const name of [...allNames].sort()) {
    const opt = document.createElement('option');
    opt.value = name;
    exerciseSuggestions.appendChild(opt);
  }
}

// Registra os eventos que alternam entre as páginas da aplicação.
function setupNavigation() {
  // Exibe a página escolhida, marca os botões ativos e atualiza os dados dela.
  function switchPage(pageName) {
    currentPage = pageName;
    for (const key in pages) {
      if (pages[key]) {
        pages[key].classList.toggle('active', key === pageName);
      }
    }
    navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageName));
    mobileNavBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageName));

    if (pageName === 'inicio') renderInicioPage();
    if (pageName === 'treino') renderTreinoPage();
    if (pageName === 'historico') renderHistoricoPage();
    if (pageName === 'evolucao') renderEvolucaoPage();

    // Atualiza a visibilidade do cronômetro flutuante conforme a navegação.
    checkFloatingTimerVisibility();
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  // Cartões e botões da tela inicial que levam a outras áreas.
  $$('[data-jump]').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.dataset.jump;
      if (target) switchPage(target);
    });
  });

  if (btnHomeStartWorkout) {
    btnHomeStartWorkout.addEventListener('click', () => {
      // Ao iniciar pela tela inicial, seleciona o dia de hoje.
      const today = new Date().getDay();
      activeWorkoutDay = today;
      if (workoutDaySelect) workoutDaySelect.value = String(today);
      switchPage('treino');
    });
  }

  if (btnHomeViewRoutine) {
    btnHomeViewRoutine.addEventListener('click', () => {
      switchPage('rotina');
    });
  }

  // Clicar no cronômetro flutuante abre a tela Treino.
  const floatingTimerMain = $('.floating-timer-main');
  if (floatingTimerMain) {
    floatingTimerMain.addEventListener('click', () => {
      switchPage('treino');
    });
  }
}

// Atualiza a data, a mensagem do dia e os totais/resumos da tela inicial.
function renderInicioPage() {
  const today = new Date().getDay();
  const dayNameFull = DAY_NAMES[today];
  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const formattedDate = now.toLocaleDateString('pt-BR', options);

  if (homeDateLabel) {
    homeDateLabel.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  const todayData = appData.routine[today];
  const todayExercises = (todayData && Array.isArray(todayData.exercises)) ? todayData.exercises : [];
  const dayLabel = todayData?.label ? todayData.label.trim() : '';

  if (homeGreetingTitle && homeHeroDesc) {
    if (todayExercises.length > 0) {
      homeGreetingTitle.textContent = dayLabel ? `Hoje: ${dayLabel} 💪` : `Treino de ${dayNameFull} 💪`;
      homeHeroDesc.textContent = `Você tem ${todayExercises.length} exercício${todayExercises.length > 1 ? 's' : ''} programado${todayExercises.length > 1 ? 's' : ''} para hoje. Acompanhe a execução, use o cronômetro e supere seus limites!`;
    } else {
      homeGreetingTitle.textContent = `Descanso ou Planejamento 🧘`;
      homeHeroDesc.textContent = `Nenhum treino programado para hoje (${dayNameFull}). Aproveite para descansar a musculatura ou configure sua rotina na aba 'Rotina'!`;
    }
  }

  // Calcula os indicadores usando o histórico e a rotina cadastrada.
  const historyCount = (appData.history || []).length;
  let totalVol = 0;
  (appData.history || []).forEach(h => {
    if (typeof h.totalVolume === 'number' && h.totalVolume > 0) {
      totalVol += h.totalVolume;
    } else if (Array.isArray(h.exercises)) {
      h.exercises.forEach(ex => {
        (ex.sets || []).forEach(s => {
          totalVol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        });
      });
    }
  });

  let activeDaysCount = 0;
  let totalRoutineExercises = 0;
  const distinctRoutineExercises = new Set();
  for (const d in appData.routine) {
    const list = appData.routine[d]?.exercises;
    if (Array.isArray(list) && list.length > 0) {
      activeDaysCount++;
      totalRoutineExercises += list.length;
      list.forEach(ex => distinctRoutineExercises.add(ex.name));
    }
  }

  if (homeTotalWorkouts) {
    homeTotalWorkouts.textContent = String(historyCount);
  }
  if (homeTotalVolume) {
    if (totalVol >= 1000) {
      homeTotalVolume.textContent = (totalVol / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' t';
    } else {
      homeTotalVolume.textContent = Math.round(totalVol).toLocaleString('pt-BR') + ' kg';
    }
  }
  if (homeActiveRoutineDays) {
    homeActiveRoutineDays.textContent = `${activeDaysCount} ${activeDaysCount === 1 ? 'dia' : 'dias'}`;
  }
  if (homeTotalExercises) {
    homeTotalExercises.textContent = String(distinctRoutineExercises.size);
  }

  // Feature cards summaries
  if (homeRoutineSummary) {
    homeRoutineSummary.textContent = `${totalRoutineExercises} exercício${totalRoutineExercises === 1 ? '' : 's'} em ${activeDaysCount} ${activeDaysCount === 1 ? 'dia' : 'dias'}`;
  }
  if (homeTodaySummary) {
    if (todayExercises.length > 0) {
      homeTodaySummary.textContent = `${todayExercises.length} exercício${todayExercises.length > 1 ? 's' : ''} (${dayLabel || dayNameFull})`;
    } else {
      homeTodaySummary.textContent = `Descanso hoje (${dayNameFull})`;
    }
  }
  if (homeHistorySummary) {
    homeHistorySummary.textContent = `${historyCount} treino${historyCount === 1 ? '' : 's'} registrado${historyCount === 1 ? '' : 's'}`;
  }
  if (homeEvolutionSummary) {
    homeEvolutionSummary.textContent = distinctRoutineExercises.size > 0 
      ? `${distinctRoutineExercises.size} exercício${distinctRoutineExercises.size === 1 ? '' : 's'} para gráficos`
      : 'Sem registros ainda';
  }
}

// Decide se o cronômetro precisa ficar visível como atalho fora da tela Treino.
function checkFloatingTimerVisibility() {
  timer?.updateUI();
}

// ═══════════════════════════════════════════
//  TELA ROTINA
// ═══════════════════════════════════════════
// Registra os eventos das abas dos dias, do rótulo e do formulário de exercício.
function setupRoutinePage() {
  // Abas para escolher o dia da rotina.
  dayTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setActiveDay(parseInt(tab.dataset.day));
    });
  });

  // Campo do nome personalizado do treino.
  dayLabelInput.addEventListener('input', () => {
    appData.routine[selectedDay].label = dayLabelInput.value;
    saveData();
  });

  // Filtros rápidos em pílulas (Grupos Musculares)
  muscleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      muscleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeMuscleFilter = chip.dataset.muscle;
      populateExerciseSuggestions(activeMuscleFilter);

      if (activeMuscleFilter !== 'todos' && !exNameInput.value) {
        exNameInput.placeholder = `Exercícios de ${chip.textContent.trim()}...`;
      } else if (!exNameInput.value) {
        exNameInput.placeholder = 'Supino reto';
      }
    });
  });

  // Auto-preenchimento ao digitar ou selecionar exercício conhecido
  exNameInput.addEventListener('change', () => {
    const val = exNameInput.value.trim().toLowerCase();
    const found = EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === val);
    if (found) {
      if (exSetsInput && (!exSetsInput.value || exSetsInput.value === '3')) exSetsInput.value = found.defaultSets;
      if (exRepsInput && (!exRepsInput.value || exRepsInput.value === '12')) exRepsInput.value = found.defaultReps;
      if (exRestInput && (!exRestInput.value || exRestInput.value === '60')) exRestInput.value = found.defaultRest;
    }
  });

  // Integração com a Biblioteca / Catálogo Completo
  btnOpenCatalog?.addEventListener('click', () => openCatalogModal(activeMuscleFilter));
  btnInputCatalog?.addEventListener('click', (e) => {
    e.stopPropagation();
    openCatalogModal(activeMuscleFilter);
  });
  exNameInput?.addEventListener('click', () => {
    if (!exNameInput.value) {
      openCatalogModal(activeMuscleFilter);
    }
  });
  btnCloseCatalog?.addEventListener('click', closeCatalogModal);
  catalogModalOverlay?.addEventListener('click', (e) => {
    if (e.target === catalogModalOverlay) closeCatalogModal();
  });
  catalogSearchInput?.addEventListener('input', () => {
    renderCatalogList();
  });

  // Botão que adiciona um exercício.
  btnAddExercise.addEventListener('click', addExercise);

  // Permite adicionar o exercício pressionando Enter no campo do nome.
  exNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addExercise();
  });
}

// ─── Modal do Catálogo de Exercícios ──────────
function openCatalogModal(initialMuscle = 'todos') {
  if (!catalogModalOverlay) return;
  catalogModalOverlay.hidden = false;
  activeCatalogTab = initialMuscle || activeMuscleFilter || 'todos';
  if (catalogSearchInput) {
    catalogSearchInput.value = '';
    setTimeout(() => catalogSearchInput.focus(), 80);
  }
  renderCatalogTabs();
  renderCatalogList();
}

function closeCatalogModal() {
  if (catalogModalOverlay) {
    catalogModalOverlay.hidden = true;
  }
}

function renderCatalogTabs() {
  if (!catalogMuscleTabs) return;
  catalogMuscleTabs.innerHTML = '';
  MUSCLE_GROUPS.forEach(g => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `catalog-muscle-tab ${g.id === activeCatalogTab ? 'active' : ''}`;
    tab.innerHTML = `<i class="${g.icon}"></i> <span>${g.label}</span>`;
    tab.addEventListener('click', () => {
      activeCatalogTab = g.id;
      catalogMuscleTabs.querySelectorAll('.catalog-muscle-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCatalogList();
    });
    catalogMuscleTabs.appendChild(tab);
  });
}

function renderCatalogList() {
  if (!catalogExercisesGrid) return;
  catalogExercisesGrid.innerHTML = '';

  const query = (catalogSearchInput?.value || '').trim().toLowerCase();

  const filtered = EXERCISE_LIBRARY.filter(ex => {
    const matchesTab = activeCatalogTab === 'todos' || ex.muscle === activeCatalogTab;
    const matchesQuery = !query || ex.name.toLowerCase().includes(query) || ex.muscle.toLowerCase().includes(query);
    return matchesTab && matchesQuery;
  });

  if (filtered.length === 0) {
    catalogExercisesGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
        <i class="ri-search-line" style="font-size: 2.2rem;"></i>
        <h3>Nenhum exercício encontrado</h3>
        <p>Tente buscar por outro termo ou mude de grupo muscular</p>
      </div>`;
    return;
  }

  filtered.forEach(ex => {
    const card = document.createElement('div');
    card.className = 'catalog-item-card';
    card.innerHTML = `
      <div class="catalog-item-info">
        <div class="catalog-item-name">${escapeHtml(ex.name)}</div>
        <div class="catalog-item-meta">
          ${getMuscleBadgeHtml(ex.name)}
          <span><i class="ri-repeat-line"></i> ${ex.defaultSets}×${escapeHtml(ex.defaultReps)}</span>
          <span><i class="ri-timer-line"></i> ${ex.defaultRest}s</span>
        </div>
      </div>
      <button type="button" class="catalog-item-add" title="Selecionar ${escapeHtml(ex.name)}">
        <i class="ri-add-line"></i>
      </button>
    `;

    card.addEventListener('click', () => {
      selectExerciseFromCatalog(ex);
    });

    catalogExercisesGrid.appendChild(card);
  });
}

function selectExerciseFromCatalog(ex) {
  if (exNameInput) exNameInput.value = ex.name;
  if (exSetsInput) exSetsInput.value = ex.defaultSets;
  if (exRepsInput) exRepsInput.value = ex.defaultReps;
  if (exRestInput) exRestInput.value = ex.defaultRest;

  closeCatalogModal();

  if (exWeightInput) {
    exWeightInput.focus();
  }

  showToast(`"${ex.name}" selecionado! Defina a carga e adicione.`, 'success');
}

// Seleciona um dia da semana e atualiza a lista de exercícios exibida.
function setActiveDay(day) {
  selectedDay = day;
  dayTabs.forEach(tab => {
    tab.classList.toggle('active', parseInt(tab.dataset.day) === day);
  });
  updateDayTabIndicators();
  renderRoutineDay();
}

// Marca com um indicador visual os dias que já possuem exercícios cadastrados.
function updateDayTabIndicators() {
  dayTabs.forEach(tab => {
    const dayNum = parseInt(tab.dataset.day);
    const dayData = appData.routine[dayNum];
    const hasExercises = dayData && Array.isArray(dayData.exercises) && dayData.exercises.length > 0;
    tab.classList.toggle('has-exercises', hasExercises);
  });
}

// Reconstrói a lista de exercícios e o rótulo do dia atualmente selecionado.
function renderRoutineDay() {
  const dayData = appData.routine[selectedDay];
  if (!dayData) return;

  // Atualiza o campo com o nome salvo para o dia.
  dayLabelInput.value = dayData.label || '';

  // Limpa e reconstrói a lista de exercícios daquele dia.
  routineExerciseList.innerHTML = '';

  if (!Array.isArray(dayData.exercises) || dayData.exercises.length === 0) {
    routineExerciseList.innerHTML = `
      <div class="empty-state" style="padding: 30px;">
        <i class="ri-add-circle-line" style="font-size: 2rem;"></i>
        <p>Nenhum exercício adicionado para ${DAY_NAMES[selectedDay]}</p>
      </div>`;
    return;
  }

  dayData.exercises.forEach((ex, idx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.draggable = true;
    card.dataset.index = idx;

    card.innerHTML = `
      <span class="drag-handle"><i class="ri-draggable"></i></span>
      <span class="ex-number">${idx + 1}</span>
      <div class="ex-info">
        <div class="ex-name">${escapeHtml(ex.name)} ${getMuscleBadgeHtml(ex.name)}</div>
        <div class="ex-details">
          <span><i class="ri-repeat-line"></i> ${ex.sets}×${escapeHtml(ex.reps)}</span>
          <span><i class="ri-scales-3-line"></i> ${ex.weight > 0 ? ex.weight + 'kg' : '—'}</span>
          <span><i class="ri-timer-line"></i> ${ex.rest}s</span>
        </div>
      </div>
      <div class="ex-actions">
        <button class="btn-icon" title="Editar" data-action="edit" data-index="${idx}">
          <i class="ri-pencil-line"></i>
        </button>
        <button class="btn-icon danger" title="Remover" data-action="delete" data-index="${idx}">
          <i class="ri-delete-bin-line"></i>
        </button>
      </div>`;

    // Eventos necessários para reordenar os exercícios por arraste.
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    // Action buttons
    card.querySelector('[data-action="edit"]').addEventListener('click', () => openEditExerciseModal(idx));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteExercise(idx));

    routineExerciseList.appendChild(card);
  });
}

// Valida o nome, cria um exercício e o adiciona à rotina do dia selecionado.
function addExercise() {
  const name = exNameInput.value.trim();
  if (!name || name.length > 100) {
    showToast('Informe um nome de exercício com até 100 caracteres', 'error');
    exNameInput.focus();
    return;
  }

  const values = getRoutineExerciseFormValues({
    sets: exSetsInput,
    reps: exRepsInput,
    weight: exWeightInput,
    rest: exRestInput,
  });
  if (!values) return;

  const exercise = {
    id: generateId(),
    name,
    ...values,
  };

  appData.routine[selectedDay].exercises.push(exercise);
  saveData();

  // Clear form
  exNameInput.value = '';
  exWeightInput.value = '';
  exNameInput.focus();

  renderRoutineDay();
  updateDayTabIndicators();
  populateExerciseSuggestions();
  showToast(`${exercise.name} adicionado!`, 'success');
}

function getRoutineExerciseFormValues(inputs) {
  const sets = Number(inputs.sets.value);
  if (!Number.isInteger(sets) || sets < 1 || sets > 100) {
    showToast('O número de séries deve estar entre 1 e 100', 'error');
    inputs.sets.focus();
    return null;
  }

  const reps = inputs.reps.value.trim();
  if (!reps || reps.length > 20) {
    showToast('Informe repetições válidas (até 20 caracteres)', 'error');
    inputs.reps.focus();
    return null;
  }

  const weight = inputs.weight.value === '' ? 0 : Number(inputs.weight.value);
  if (!Number.isFinite(weight) || weight < 0) {
    showToast('A carga deve ser um número igual ou maior que zero', 'error');
    inputs.weight.focus();
    return null;
  }

  const rest = Number(inputs.rest.value);
  if (!Number.isInteger(rest) || rest < 1 || rest > 3600) {
    showToast('O descanso deve estar entre 1 e 3600 segundos', 'error');
    inputs.rest.focus();
    return null;
  }

  return { sets, reps, weight, rest };
}

// Pede confirmação antes de remover da rotina o exercício indicado pelo índice.
function deleteExercise(idx) {
  const ex = appData.routine[selectedDay].exercises[idx];
  openConfirmModal(
    'Remover Exercício',
    `Deseja remover <strong>${escapeHtml(ex.name)}</strong> da rotina de ${DAY_NAMES[selectedDay]}?`,
    () => {
      appData.routine[selectedDay].exercises.splice(idx, 1);
      saveData();
      renderRoutineDay();
      updateDayTabIndicators();
      showToast('Exercício removido', 'success');
    }
  );
}

// Preenche o modal com os dados atuais e salva as alterações após validação.
function openEditExerciseModal(idx) {
  const ex = appData.routine[selectedDay].exercises[idx];

  modalTitle.textContent = 'Editar Exercício';
  modalBody.innerHTML = `
    <div class="form-group">
      <label>Nome</label>
      <input type="text" id="editExName" value="${escapeHtml(ex.name)}" class="input-text" list="exerciseSuggestions" maxlength="100">
    </div>
    <div class="form-group">
      <label>Séries</label>
      <input type="number" id="editExSets" value="${ex.sets}" min="1" max="100" class="input-text">
    </div>
    <div class="form-group">
      <label>Repetições</label>
      <input type="text" id="editExReps" value="${escapeHtml(ex.reps)}" class="input-text" maxlength="20">
    </div>
    <div class="form-group">
      <label>Carga (kg)</label>
      <input type="number" id="editExWeight" value="${ex.weight}" min="0" step="0.5" class="input-text">
    </div>
    <div class="form-group">
      <label>Descanso (seg)</label>
      <input type="number" id="editExRest" value="${ex.rest}" min="1" max="3600" step="5" class="input-text">
    </div>`;

  modalFooter.innerHTML = `
    <button class="btn btn-ghost" id="editCancel">Cancelar</button>
    <button class="btn btn-primary" id="editSave">Salvar</button>`;

  showModal();

  $('#editCancel').addEventListener('click', hideModal);
  $('#editSave').addEventListener('click', () => {
    const newName = $('#editExName').value.trim();
    if (!newName || newName.length > 100) {
      showToast('Informe um nome de exercício com até 100 caracteres', 'error');
      return;
    }
    const values = getRoutineExerciseFormValues({
      sets: $('#editExSets'),
      reps: $('#editExReps'),
      weight: $('#editExWeight'),
      rest: $('#editExRest'),
    });
    if (!values) return;
    ex.name = newName;
    Object.assign(ex, values);
    saveData();
    hideModal();
    renderRoutineDay();
    populateExerciseSuggestions();
    showToast('Exercício atualizado!', 'success');
  });
}

// Índice do exercício que está sendo arrastado para mudar a ordem da rotina.
let dragSrcIndex = null;

// Guarda a origem do arraste e ativa a aparência visual de item em movimento.
function handleDragStart(e) {
  dragSrcIndex = parseInt(this.dataset.index);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

// Permite que o cartão atual seja um destino válido para soltar o exercício.
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

// Move o exercício na lista, persiste a nova ordem e atualiza a tela.
function handleDrop(e) {
  e.preventDefault();
  const targetIndex = parseInt(this.dataset.index);
  if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

  const exercises = appData.routine[selectedDay].exercises;
  const [moved] = exercises.splice(dragSrcIndex, 1);
  exercises.splice(targetIndex, 0, moved);
  saveData();
  renderRoutineDay();
}

// Remove o estilo de arraste e limpa o índice temporário ao terminar.
function handleDragEnd() {
  this.classList.remove('dragging');
  dragSrcIndex = null;
}

// ═══════════════════════════════════════════
//  TELA TREINO DO DIA
// ═══════════════════════════════════════════
// Índice em foco e referências do painel de progresso do treino.
let focusedExerciseIndex = null;
let focusedExerciseId = null;
let workoutProgressPanel, workoutProgressCount, workoutProgressFill;

// Conecta o seletor de dia e o botão que salva o treino no histórico.
function setupTreinoPage() {
  btnFinishWorkout.addEventListener('click', finishWorkout);

  if (workoutDaySelect) {
    workoutDaySelect.addEventListener('change', (e) => {
      activeWorkoutDay = parseInt(e.target.value);
      focusedExerciseIndex = null;
      focusedExerciseId = null;
      renderTreinoPage();
    });
  }
}

// Prepara o estado temporário do treino e desenha exercícios, séries e progresso.
function renderTreinoPage() {
  const dayIndex = activeWorkoutDay;
  const dayData = appData.routine[dayIndex];
  if (!dayData) return;

  const dayLabel = dayData.label || DAY_NAMES[dayIndex];
  const isActualToday = dayIndex === new Date().getDay();

  treinoDayBadge.textContent = isActualToday ? `Hoje · ${DAY_NAMES[dayIndex]}` : `${DAY_NAMES[dayIndex]}`;
  treinoSubtitle.textContent = dayLabel !== DAY_NAMES[dayIndex]
    ? `${dayLabel} — Execute seus exercícios na ordem`
    : 'Execute seus exercícios na ordem';

  if (!workoutProgressPanel) {
    workoutProgressPanel = $('#workoutProgressPanel');
    workoutProgressCount = $('#workoutProgressCount');
    workoutProgressFill = $('#workoutProgressFill');
  }

  if (!Array.isArray(dayData.exercises) || dayData.exercises.length === 0) {
    delete workoutInProgress[dayIndex];
    workoutExercises.innerHTML = '';
    workoutActions.hidden = true;
    if (workoutProgressPanel) workoutProgressPanel.hidden = true;
    treinoEmpty.style.display = '';
    return;
  }

  treinoEmpty.style.display = 'none';
  workoutActions.hidden = false;
  if (workoutProgressPanel) workoutProgressPanel.hidden = false;

  // Reconcilia o treino em andamento com a rotina atual, preservando séries já feitas.
  const previousWorkout = workoutInProgress[dayIndex] || [];
  const previousById = new Map(previousWorkout.map(exercise => [exercise.exerciseId, exercise]));
  workoutInProgress[dayIndex] = dayData.exercises.map(exercise => {
    const previous = previousById.get(exercise.id);
    const rangeEnd = typeof exercise.reps === 'string' && exercise.reps.includes('-')
      ? Number.parseInt(exercise.reps.split('-')[1], 10)
      : Number.parseInt(exercise.reps, 10);
    const defaultReps = Number.isFinite(rangeEnd) && rangeEnd > 0 ? rangeEnd : 12;
    const sets = Array.from({ length: exercise.sets }, (_, index) => {
      const existingSet = previous?.sets[index];
      return existingSet
        ? { ...existingSet, done: Boolean(existingSet.done) }
        : { weight: exercise.weight || 0, reps: defaultReps, done: false };
    });
    return {
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: exercise.sets,
      targetReps: exercise.reps,
      rest: exercise.rest || 60,
      completed: sets.length > 0 && sets.every(set => set.done),
      sets,
    };
  });

  const workout = workoutInProgress[dayIndex];

  // Mantém o foco no mesmo exercício se a lista for reordenada.
  const firstUnfinishedIndex = workout.findIndex(ex => !ex.completed);
  if (focusedExerciseId) {
    focusedExerciseIndex = workout.findIndex(ex => ex.exerciseId === focusedExerciseId);
  }
  if (focusedExerciseIndex === null || focusedExerciseIndex < 0 || focusedExerciseIndex >= workout.length) {
    focusedExerciseIndex = firstUnfinishedIndex !== -1 ? firstUnfinishedIndex : 0;
  }
  focusedExerciseId = workout[focusedExerciseIndex].exerciseId;

  // Atualiza a barra e o contador de exercícios concluídos.
  const completedExercisesCount = workout.filter(ex => ex.completed).length;
  const totalExercisesCount = workout.length;
  const percentDone = Math.round((completedExercisesCount / totalExercisesCount) * 100);

  if (workoutProgressFill) {
    workoutProgressFill.style.width = `${percentDone}%`;
  }
  if (workoutProgressCount) {
    workoutProgressCount.textContent = `${completedExercisesCount} de ${totalExercisesCount} concluídos (${percentDone}%)`;
  }

  workoutExercises.innerHTML = '';

  // Exibe uma mensagem quando todos os exercícios foram concluídos.
  if (completedExercisesCount === totalExercisesCount && totalExercisesCount > 0) {
    const banner = document.createElement('div');
    banner.className = 'workout-all-done-banner';
    banner.innerHTML = `
      <h3>🎉 Parabéns! Todos os exercícios concluídos!</h3>
      <p>Excelente treino! Clique em <strong>"Finalizar Treino"</strong> abaixo para salvar sua evolução.</p>`;
    workoutExercises.appendChild(banner);
  }

  workout.forEach((exData, exIdx) => {
    const isFocused = (exIdx === focusedExerciseIndex);
    const isCompleted = exData.sets.length > 0 && exData.sets.every(s => s.done);

    // Considera concluído o exercício cujas séries já foram todas marcadas.
    exData.completed = isCompleted;

    const card = document.createElement('div');

    if (isFocused) {
      // ══════════════════════════════════════════════════════════
      // 1. EXERCÍCIO GRANDE E DESTACADO (FOCO ATUAL)
      // ══════════════════════════════════════════════════════════
      card.className = `workout-ex-card is-focused${isCompleted ? ' completed' : ''}`;

      let setsHTML = '';
      exData.sets.forEach((set, setIdx) => {
        setsHTML += `
          <div class="workout-set-row">
            <span class="set-label">Série ${setIdx + 1}</span>
            <div class="set-input-group">
              <input type="number" value="${set.weight}" step="0.5" min="0"
                data-ex="${exIdx}" data-set="${setIdx}" data-field="weight"
                ${set.done ? 'disabled' : ''}>
              <span class="unit">kg</span>
            </div>
            <div class="set-input-group">
              <input type="number" value="${set.reps}" min="0"
                data-ex="${exIdx}" data-set="${setIdx}" data-field="reps"
                ${set.done ? 'disabled' : ''}>
              <span class="unit">reps</span>
            </div>
            <button class="set-check ${set.done ? 'checked' : ''}"
              data-ex="${exIdx}" data-set="${setIdx}" title="Marcar série e iniciar cronômetro">
              <i class="ri-check-line"></i>
            </button>
          </div>`;
      });

      card.innerHTML = `
        <div class="workout-ex-header">
          <div class="ex-title">
            <span class="ex-number" style="${isCompleted ? 'background: var(--success); color: #fff;' : ''}">
              ${isCompleted ? '<i class="ri-check-line"></i>' : exIdx + 1}
            </span>
            <div>
              <h4>${escapeHtml(exData.name)} ${getMuscleBadgeHtml(exData.name)}</h4>
              <span class="ex-target">${exData.targetSets} séries × ${escapeHtml(exData.targetReps)} reps · Descanso: ${exData.rest}s</span>
            </div>
          </div>
          ${isCompleted
            ? '<span class="completed-badge"><i class="ri-checkbox-circle-fill"></i> Exercício Concluído</span>'
            : '<span class="workout-focus-badge"><i class="ri-fire-fill"></i> Exercício Atual</span>'}
        </div>

        <div class="workout-sets">${setsHTML}</div>

        <div class="workout-ex-footer">
          <div class="workout-ex-summary-chips">
            <span><i class="ri-timer-line"></i> Descanso configurado: ${exData.rest}s</span>
          </div>
          ${isCompleted
            ? `<button class="btn-reopen-exercise" data-reopen-idx="${exIdx}">
                 <i class="ri-restart-line"></i> Reabrir Exercício
               </button>`
            : `<button class="btn-finish-exercise" data-finish-idx="${exIdx}">
                 <i class="ri-checkbox-circle-fill"></i> Finalizar Exercício
               </button>`}
        </div>`;

      // Mantém os valores digitados sincronizados com o estado temporário.
      card.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
          const ei = parseInt(e.target.dataset.ex);
          const si = parseInt(e.target.dataset.set);
          const field = e.target.dataset.field;
          workout[ei].sets[si][field] = parseFloat(e.target.value) || 0;
        });
      });

      // Botão que marca ou desmarca uma série individual.
      card.querySelectorAll('.set-check').forEach(btn => {
        btn.addEventListener('click', () => {
          const ei = parseInt(btn.dataset.ex);
          const si = parseInt(btn.dataset.set);
          const set = workout[ei].sets[si];
          if (!Number.isFinite(set.weight) || set.weight < 0
            || !Number.isFinite(set.reps) || set.reps < 0) {
            showToast('Carga e repetições devem ser números iguais ou maiores que zero', 'error');
            return;
          }
          set.done = !set.done;

          if (set.done) {
            timer.start(workout[ei].rest);
            showToast(`Série ${si + 1} concluída! Descanso iniciado (${workout[ei].rest}s)`, 'success');
          }

          // Marca o exercício como concluído se todas as séries foram feitas.
          workout[ei].completed = workout[ei].sets.length > 0
            && workout[ei].sets.every(s => s.done);

          renderTreinoPage();
        });
      });

      // Botão para concluir de uma vez todas as séries do exercício.
      const btnFinish = card.querySelector('[data-finish-idx]');
      if (btnFinish) {
        btnFinish.addEventListener('click', () => {
          // Marca todas as séries deste exercício como concluídas.
          exData.sets.forEach(s => s.done = true);
          exData.completed = true;

          playFinishSound();
          showToast(`✓ ${exData.name} finalizado com sucesso!`, 'success');

          // Inicia o descanso configurado para este exercício.
          timer.start(exData.rest);

          // Avança para o próximo exercício pendente, se houver.
          const nextIdx = workout.findIndex((ex, i) => i > exIdx && !ex.completed);
          if (nextIdx !== -1) {
            focusedExerciseIndex = nextIdx;
            focusedExerciseId = workout[nextIdx].exerciseId;
          } else {
            const anyUnfinished = workout.findIndex(ex => !ex.completed);
            focusedExerciseIndex = (anyUnfinished !== -1 ? anyUnfinished : exIdx);
            focusedExerciseId = workout[focusedExerciseIndex].exerciseId;
          }

          renderTreinoPage();
        });
      }

      // Botão para reabrir um exercício já concluído.
      const btnReopen = card.querySelector('[data-reopen-idx]');
      if (btnReopen) {
        btnReopen.addEventListener('click', () => {
          exData.completed = false;
          exData.sets.forEach(set => {
            set.done = false;
          });
          renderTreinoPage();
        });
      }

    } else if (isCompleted) {
      // ══════════════════════════════════════════════════════════
      // 2. EXERCÍCIO CONCLUÍDO (COMPACTO E VERDE)
      // ══════════════════════════════════════════════════════════
      card.className = 'workout-ex-card is-compact completed';
      const maxWeight = Math.max(...exData.sets.map(s => s.weight || 0));

      card.innerHTML = `
        <div class="workout-ex-header" title="Clique para rever ou editar">
          <div class="ex-title">
            <span class="ex-number" style="background: var(--success); color: #fff;">
              <i class="ri-check-line"></i>
            </span>
            <div>
              <h4>${escapeHtml(exData.name)} ${getMuscleBadgeHtml(exData.name)}</h4>
              <span class="ex-target" style="color: var(--success);">
                ✓ Finalizado · ${exData.sets.length} séries ${maxWeight > 0 ? `· Carga máx: ${maxWeight}kg` : ''}
              </span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="completed-badge"><i class="ri-check-line"></i> Concluído</span>
            <i class="ri-arrow-down-s-line" style="color: var(--text-dim); font-size: 1.2rem;"></i>
          </div>
        </div>`;

      // Clicar no cartão coloca este exercício novamente em foco.
      card.addEventListener('click', () => {
        focusedExerciseIndex = exIdx;
        focusedExerciseId = exData.exerciseId;
        renderTreinoPage();
      });

    } else {
      // ══════════════════════════════════════════════════════════
      // 3. EXERCÍCIO NA FILA (COMPACTO AGUARDANDO A VEZ)
      // ══════════════════════════════════════════════════════════
      card.className = 'workout-ex-card is-compact is-queued';

      card.innerHTML = `
        <div class="workout-ex-header" title="Clique para focar neste exercício">
          <div class="ex-title">
            <span class="ex-number" style="background: rgba(255, 255, 255, 0.06); color: var(--text-muted);">
              ${exIdx + 1}
            </span>
            <div>
              <h4>${escapeHtml(exData.name)} ${getMuscleBadgeHtml(exData.name)}</h4>
              <span class="ex-target">${exData.targetSets}×${escapeHtml(exData.targetReps)} · Descanso: ${exData.rest}s</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge" style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted); font-size: 0.75rem;">
              Na fila
            </span>
            <i class="ri-play-circle-line" style="color: var(--primary-light); font-size: 1.3rem;"></i>
          </div>
        </div>`;

      // Clicar no cartão seleciona imediatamente este exercício.
      card.addEventListener('click', () => {
        focusedExerciseIndex = exIdx;
        focusedExerciseId = exData.exerciseId;
        renderTreinoPage();
      });
    }

    workoutExercises.appendChild(card);
  });
}

// Salva no histórico apenas séries concluídas, depois limpa o treino em andamento.
function finishWorkout() {
  const dayIndex = activeWorkoutDay;
  const workout = workoutInProgress[dayIndex];

  if (!workout) return;

  const anyDone = workout.some(ex => ex.sets.some(s => s.done));
  if (!anyDone) {
    showToast('Complete pelo menos uma série antes de finalizar', 'error');
    return;
  }

  const hasInvalidSet = workout.some(ex => ex.sets.some(set =>
    set.done && (!Number.isFinite(set.weight) || set.weight < 0
      || !Number.isFinite(set.reps) || set.reps < 0)));
  if (hasInvalidSet) {
    showToast('Corrija a carga e as repetições das séries concluídas antes de salvar', 'error');
    return;
  }

  openConfirmModal(
    'Finalizar Treino',
    'Deseja salvar este treino no histórico? Os dados de todas as séries marcadas serão registrados.',
    () => {
      const session = {
        id: generateId(),
        date: new Date().toISOString(),
        dayOfWeek: dayIndex,
        dayLabel: appData.routine[dayIndex].label || DAY_NAMES[dayIndex],
        exercises: workout.map(ex => ({
          name: ex.name,
          sets: ex.sets
            .filter(s => s.done)
            .map(s => ({ weight: s.weight, reps: s.reps })),
        })).filter(ex => ex.sets.length > 0),
      };

      appData.history.unshift(session);
      saveData();

      // Descarta o estado temporário após salvar a sessão no histórico.
      delete workoutInProgress[dayIndex];

      timer.cancel();
      renderTreinoPage();
      showToast('Treino salvo com sucesso! 💪', 'success');
    }
  );
}

// ═══════════════════════════════════════════
//  TELA HISTÓRICO
// ═══════════════════════════════════════════
// Não há configuração inicial específica para esta tela; seu conteúdo é renderizado
// quando ela é aberta.
function setupHistoricoPage() {}

// Desenha um cartão por sessão, calcula volume/séries e permite expandir ou excluir.
function renderHistoricoPage() {
  if (!appData.history || appData.history.length === 0) {
    historyList.innerHTML = '';
    historicoEmpty.style.display = '';
    return;
  }

  historicoEmpty.style.display = 'none';
  historyList.innerHTML = '';

  appData.history.forEach((session, idx) => {
    const date = new Date(session.date);
    const dayNum = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const totalVolume = session.exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0), 0);

    const card = document.createElement('div');
    card.className = 'history-card';

    let exercisesHTML = '';
    session.exercises.forEach(ex => {
      const setsChips = ex.sets.map(s =>
        `<span class="history-set-chip">${s.weight}kg × ${s.reps}</span>`
      ).join('');

      exercisesHTML += `
        <div class="history-exercise">
          <h5>${escapeHtml(ex.name)}</h5>
          <div class="history-sets">${setsChips}</div>
        </div>`;
    });

    card.innerHTML = `
      <div class="history-card-header">
        <div class="date-info">
          <div class="date-badge">
            <span class="day-num">${dayNum}</span>
            <span class="month">${month}</span>
          </div>
          <div class="workout-meta">
            <h4>${escapeHtml(session.dayLabel)}</h4>
            <p>${session.exercises.length} exercícios · ${totalSets} séries · ${Math.round(totalVolume)}kg volume</p>
          </div>
        </div>
        <i class="ri-arrow-down-s-line expand-icon"></i>
      </div>
      <div class="history-card-body">
        ${exercisesHTML}
        <div class="history-actions">
          <button class="btn btn-danger btn-sm" data-delete-session="${idx}">
            <i class="ri-delete-bin-line"></i> Excluir
          </button>
        </div>
      </div>`;

    card.querySelector('.history-card-header').addEventListener('click', () => {
      card.classList.toggle('expanded');
    });

    card.querySelector('[data-delete-session]').addEventListener('click', (e) => {
      e.stopPropagation();
      openConfirmModal(
        'Excluir Treino',
        `Deseja excluir o treino de <strong>${dayNum}/${month}</strong>? Esta ação não pode ser desfeita.`,
        () => {
          appData.history.splice(idx, 1);
          saveData();
          renderHistoricoPage();
          showToast('Treino excluído', 'success');
        }
      );
    });

    historyList.appendChild(card);
  });
}

// ═══════════════════════════════════════════
//  TELA EVOLUÇÃO
// ═══════════════════════════════════════════
// Atualiza o gráfico quando o exercício ou a métrica selecionada muda.
function setupEvolucaoPage() {
  evoExerciseSelect.addEventListener('change', renderEvolutionChart);
  evoMetricSelect.addEventListener('change', renderEvolutionChart);
}

// Reúne os nomes de exercícios presentes no histórico para preencher o seletor.
function renderEvolucaoPage() {
  const exerciseNames = new Set();
  if (appData.history) {
    appData.history.forEach(session => {
      session.exercises.forEach(ex => exerciseNames.add(ex.name));
    });
  }

  const currentVal = evoExerciseSelect.value;
  evoExerciseSelect.innerHTML = '<option value="">Selecione um exercício</option>';
  [...exerciseNames].sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === currentVal) opt.selected = true;
    evoExerciseSelect.appendChild(opt);
  });

  renderEvolutionChart();
}

// Calcula métricas por sessão, atualiza os indicadores e desenha o gráfico Chart.js.
function renderEvolutionChart() {
  const exerciseName = evoExerciseSelect.value;
  if (!exerciseName) {
    clearEvolutionResults();
    return;
  }

  const dataPoints = [];
  for (let i = appData.history.length - 1; i >= 0; i--) {
    const session = appData.history[i];
    const sets = session.exercises
      .filter(exercise => exercise.name === exerciseName)
      .flatMap(exercise => exercise.sets);
    if (sets.length === 0) continue;

    const maxWeight = Math.max(...sets.map(set => set.weight));
    const avgWeight = sets.reduce((sum, set) => sum + set.weight, 0) / sets.length;
    const totalVolume = sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);

    dataPoints.push({
      date: new Date(session.date),
      maxWeight,
      avgWeight,
      totalVolume,
    });
  }

  dataPoints.sort((a, b) => a.date - b.date);

  if (dataPoints.length === 0) {
    clearEvolutionResults();
    return;
  }

  evolucaoEmpty.style.display = 'none';
  statsCards.hidden = false;
  chartContainer.hidden = false;

  const metric = evoMetricSelect.value;
  const values = dataPoints.map(d => d[metric]);

  const record = Math.max(...values);
  const first = values[0];
  const last = values[values.length - 1];
  const progressNum = first > 0 ? ((last - first) / first) * 100 : null;

  statRecord.textContent = metric === 'totalVolume'
    ? `${Math.round(record).toLocaleString('pt-BR')} kg × reps`
    : `${record.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

  if (progressNum !== null) {
    statProgress.textContent = `${progressNum > 0 ? '+' : ''}${progressNum.toFixed(1)}%`;
    statProgress.style.color = progressNum > 0 ? 'var(--success)' : progressNum < 0 ? 'var(--danger)' : 'var(--text)';
  } else {
    statProgress.textContent = '—';
    statProgress.style.color = 'var(--text)';
  }

  statSessions.textContent = dataPoints.length;

  const labels = dataPoints.map(d => {
    return `${d.date.getDate()}/${MONTH_NAMES[d.date.getMonth()]}`;
  });

  const metricLabels = {
    maxWeight: 'Carga Máxima (kg)',
    totalVolume: 'Volume Total (kg × reps)',
    avgWeight: 'Carga Média (kg)',
  };

  if (evolutionChart) evolutionChart.destroy();

  const ctx = document.getElementById('evolutionChart').getContext('2d');
  evolutionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metricLabels[metric],
        data: values,
        borderColor: '#6c5ce7',
        backgroundColor: 'rgba(108, 92, 231, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: '#6c5ce7',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#8888a0',
            font: { family: 'Inter', size: 12 },
          },
        },
        tooltip: {
          backgroundColor: '#1a1a26',
          titleColor: '#e8e8f0',
          bodyColor: '#e8e8f0',
          borderColor: '#2a2a3a',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          bodyFont: { family: 'Inter' },
          titleFont: { family: 'Inter', weight: 'bold' },
        },
      },
      scales: {
        x: {
          ticks: { color: '#8888a0', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(42, 42, 58, 0.5)' },
        },
        y: {
          ticks: { color: '#8888a0', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(42, 42, 58, 0.5)' },
          beginAtZero: false,
        },
      },
    },
  });
}

function clearEvolutionResults() {
  if (evolutionChart) {
    evolutionChart.destroy();
    evolutionChart = null;
  }
  statsCards.hidden = true;
  chartContainer.hidden = true;
  evolucaoEmpty.style.display = '';
}

// ═══════════════════════════════════════════
//  IMPORTAÇÃO E EXPORTAÇÃO
// ═══════════════════════════════════════════
// Associa os botões aos fluxos de exportar e importar um arquivo JSON.
function setupImportExport() {
  btnExport.addEventListener('click', exportData);
  btnImport.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importData);
}

// Cria um arquivo JSON baixável contendo a rotina e o histórico atuais.
function exportData() {
  const blob = createBackupBlob(appData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fittrack_backup_${formatDateFile(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Dados exportados com sucesso!', 'success');
}

// Lê e valida um JSON escolhido pelo usuário e pede confirmação antes de substituir dados.
async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const imported = await readBackupFile(file);
    openConfirmModal(
      'Importar Dados',
      'Isso irá <strong>substituir todos os dados atuais</strong>. Deseja continuar?',
      async () => {
        try {
          await persistPendingSnapshot();
          await saveUserData(imported);
        } catch (error) {
          console.error('Erro ao importar backup para o servidor:', error);
          showToast('Não foi possível salvar o backup nesta conta.', 'error');
          return;
        }
        pendingSnapshot = null;
        saveFailure = null;
        appData = imported;
        workoutInProgress = {};
        focusedExerciseIndex = null;
        focusedExerciseId = null;
        timer.cancel();
        setActiveDay(selectedDay);
        populateExerciseSuggestions();
        renderInicioPage();
        renderTreinoPage();
        renderHistoricoPage();
        renderEvolucaoPage();
        showToast('Dados importados com sucesso!', 'success');
      },
    );
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    importFile.value = '';
  }
}

// ═══════════════════════════════════════════
//  JANELA MODAL
// ═══════════════════════════════════════════
// Permite fechar o modal pelo botão, pelo clique fora ou pela tecla Escape.
function setupModal() {
  modalClose.addEventListener('click', hideModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hidden) hideModal();
  });
}

// Exibe o modal e impede a rolagem do conteúdo que está atrás dele.
function showModal() {
  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

// Oculta o modal e restaura a rolagem normal da página.
function hideModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
}

// Monta uma confirmação genérica; a ação informada só roda após confirmar.
function openConfirmModal(title, message, onConfirm) {
  modalTitle.textContent = title;
  modalBody.innerHTML = `<p>${message}</p>`;
  modalFooter.innerHTML = `
    <button class="btn btn-ghost" id="confirmCancel">Cancelar</button>
    <button class="btn btn-primary" id="confirmOk">Confirmar</button>`;

  showModal();

  $('#confirmCancel').addEventListener('click', hideModal);
  $('#confirmOk').addEventListener('click', () => {
    hideModal();
    onConfirm();
  });
}

// ═══════════════════════════════════════════
//  NOTIFICAÇÃO TEMPORÁRIA (TOAST)
// ═══════════════════════════════════════════
// Mostra uma mensagem de sucesso/erro e a remove automaticamente após alguns segundos.
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = document.createElement('i');
  icon.className = type === 'success' ? 'ri-check-line' : 'ri-error-warning-line';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(icon, text);

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function activateUser(user) {
  try {
    authenticatedUser = user;
    const userData = await getUserData();
    appData = userData
      ? normalizeData(userData)
      : JSON.parse(JSON.stringify(DEFAULT_DATA));
    if (!userData) await saveUserData(appData);
    init();
    if (appInitialized) {
      const today = new Date().getDay();
      selectedDay = today;
      activeWorkoutDay = today;
      workoutInProgress = {};
      focusedExerciseIndex = null;
      focusedExerciseId = null;
      currentPage = 'inicio';
      for (const [pageName, page] of Object.entries(pages)) {
        page.classList.toggle('active', pageName === currentPage);
      }
      navBtns.forEach(button => button.classList.toggle('active', button.dataset.page === currentPage));
      mobileNavBtns.forEach(button => button.classList.toggle('active', button.dataset.page === currentPage));
      workoutDaySelect.value = String(today);
      setActiveDay(today);
      populateExerciseSuggestions();
      renderInicioPage();
      renderTreinoPage();
      renderHistoricoPage();
      renderEvolucaoPage();
      timer.cancel();
    }
    $('#userProfileBadge').hidden = false;
    $('#userAvatar').textContent = user.name.slice(0, 1);
    $('#userName').textContent = user.name;
    $('#userEmail').textContent = user.email;
    authModal.hide();
  } catch (error) {
    console.error('Erro ao carregar os dados da conta:', error);
    authenticatedUser = null;
    throw new Error('Não foi possível carregar os dados da conta. Tente novamente.');
  }
}

async function startAuthentication() {
  toastContainer = $('#toastContainer');
  authModal = createAuthModal({
    container: $('#authOverlay'),
    onAuthSuccess: activateUser,
    showToast,
  });

  try {
    const user = await checkAuthenticatedUser();
    if (user) {
      await activateUser(user);
    } else {
      // Só exibe o modal de login se o usuário NÃO possuir sessão ativa
      authModal.show('login');
    }
  } catch (error) {
    console.error('Erro ao verificar a sessão:', error);
    authModal.show('login');
    authModal.setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
  }
}

// Aguarda o HTML antes de exibir login ou recuperar uma sessão já existente.
document.addEventListener('DOMContentLoaded', startAuthentication);
