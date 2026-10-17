/**
 * FitTrack — Constants
 * Constantes compartilhadas pela aplicação.
 */

// Nomes dos dias da semana
export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Nomes dos meses
export const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Grupos musculares para categorização
export const MUSCLE_GROUPS = [
  { id: 'todos', label: 'Todos', icon: 'ri-apps-2-line', color: 'purple' },
  { id: 'peito', label: 'Peito', icon: 'ri-shield-user-line', color: 'purple' },
  { id: 'costas', label: 'Costas', icon: 'ri-body-scan-line', color: 'blue' },
  { id: 'pernas', label: 'Pernas', icon: 'ri-footprint-line', color: 'emerald' },
  { id: 'ombros', label: 'Ombros', icon: 'ri-user-follow-line', color: 'orange' },
  { id: 'bracos', label: 'Braços', icon: 'ri-boxing-line', color: 'crimson' },
  { id: 'core', label: 'Abdômen', icon: 'ri-flashlight-line', color: 'amber' },
];

// Biblioteca completa de exercícios por grupo muscular
export const EXERCISE_LIBRARY = [
  // ─── Peito ───────────────────────────────────
  { name: 'Supino reto', muscle: 'peito', defaultSets: 4, defaultReps: '10-12', defaultRest: 90 },
  { name: 'Supino inclinado com halteres', muscle: 'peito', defaultSets: 4, defaultReps: '10-12', defaultRest: 90 },
  { name: 'Supino inclinado na barra', muscle: 'peito', defaultSets: 4, defaultReps: '8-10', defaultRest: 90 },
  { name: 'Supino declinado', muscle: 'peito', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Crucifixo reto com halteres', muscle: 'peito', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Crucifixo inclinado', muscle: 'peito', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Crossover na polia alta', muscle: 'peito', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Crossover na polia média', muscle: 'peito', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Peck deck (Voador)', muscle: 'peito', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Mergulho nas paralelas', muscle: 'peito', defaultSets: 3, defaultReps: '8-12', defaultRest: 90 },
  { name: 'Flexão de braços', muscle: 'peito', defaultSets: 3, defaultReps: '15-20', defaultRest: 60 },

  // ─── Costas ──────────────────────────────────
  { name: 'Puxada frontal aberta', muscle: 'costas', defaultSets: 4, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Puxada triângulo', muscle: 'costas', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Barra fixa', muscle: 'costas', defaultSets: 3, defaultReps: '6-10', defaultRest: 90 },
  { name: 'Remada curvada com barra', muscle: 'costas', defaultSets: 4, defaultReps: '8-10', defaultRest: 90 },
  { name: 'Remada unilateral (Serrote)', muscle: 'costas', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Remada baixa no triângulo', muscle: 'costas', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Remada cavalinho', muscle: 'costas', defaultSets: 4, defaultReps: '8-10', defaultRest: 90 },
  { name: 'Pulldown na polia', muscle: 'costas', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Pullover com halter', muscle: 'costas', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Levantamento terra', muscle: 'costas', defaultSets: 3, defaultReps: '6-8', defaultRest: 120 },

  // ─── Pernas ──────────────────────────────────
  { name: 'Agachamento livre', muscle: 'pernas', defaultSets: 4, defaultReps: '8-10', defaultRest: 120 },
  { name: 'Agachamento hack', muscle: 'pernas', defaultSets: 4, defaultReps: '10-12', defaultRest: 90 },
  { name: 'Leg press 45°', muscle: 'pernas', defaultSets: 4, defaultReps: '10-12', defaultRest: 90 },
  { name: 'Cadeira extensora', muscle: 'pernas', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Mesa flexora', muscle: 'pernas', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Cadeira flexora', muscle: 'pernas', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Stiff com halteres ou barra', muscle: 'pernas', defaultSets: 4, defaultReps: '10-12', defaultRest: 90 },
  { name: 'Elevação pélvica', muscle: 'pernas', defaultSets: 4, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Cadeira adutora', muscle: 'pernas', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Cadeira abdutora', muscle: 'pernas', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Passada / Avanço com halteres', muscle: 'pernas', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Panturrilha em pé', muscle: 'pernas', defaultSets: 4, defaultReps: '15-20', defaultRest: 60 },
  { name: 'Panturrilha sentado', muscle: 'pernas', defaultSets: 4, defaultReps: '15-20', defaultRest: 60 },

  // ─── Ombros ──────────────────────────────────
  { name: 'Desenvolvimento militar com barra', muscle: 'ombros', defaultSets: 4, defaultReps: '8-10', defaultRest: 90 },
  { name: 'Desenvolvimento com halteres', muscle: 'ombros', defaultSets: 4, defaultReps: '8-10', defaultRest: 90 },
  { name: 'Elevação lateral com halteres', muscle: 'ombros', defaultSets: 4, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Elevação lateral na polia', muscle: 'ombros', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Elevação frontal', muscle: 'ombros', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Crucifixo invertido', muscle: 'ombros', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Face pull na polia', muscle: 'ombros', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Encolhimento com halteres (Trapézio)', muscle: 'ombros', defaultSets: 4, defaultReps: '12-15', defaultRest: 60 },

  // ─── Braços ──────────────────────────────────
  { name: 'Rosca direta com barra', muscle: 'bracos', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Rosca alternada com halteres', muscle: 'bracos', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Rosca martelo', muscle: 'bracos', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Rosca scott', muscle: 'bracos', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Rosca concentrada', muscle: 'bracos', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Tríceps corda', muscle: 'bracos', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Tríceps testa', muscle: 'bracos', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Tríceps francês', muscle: 'bracos', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Tríceps na polia barra reta', muscle: 'bracos', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Tríceps banco', muscle: 'bracos', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Rosca punho (Antebraço)', muscle: 'bracos', defaultSets: 3, defaultReps: '15-20', defaultRest: 45 },

  // ─── Abdômen & Core ──────────────────────────
  { name: 'Abdominal crunch', muscle: 'core', defaultSets: 3, defaultReps: '15-20', defaultRest: 45 },
  { name: 'Prancha isométrica', muscle: 'core', defaultSets: 3, defaultReps: '45-60s', defaultRest: 60 },
  { name: 'Abdominal infra na barra', muscle: 'core', defaultSets: 3, defaultReps: '12-15', defaultRest: 45 },
  { name: 'Abdominal na polia', muscle: 'core', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Roda abdominal', muscle: 'core', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
];

// Lista de nomes para compatibilidade com buscas
export const EXERCISE_SUGGESTIONS = EXERCISE_LIBRARY.map(e => e.name);

// Identifica o grupo muscular pelo nome do exercício
export function getExerciseMuscle(exerciseName) {
  if (!exerciseName) return null;
  const lower = exerciseName.trim().toLowerCase();
  const exact = EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === lower);
  if (exact) return exact.muscle;

  // Busca heurística por palavras-chave caso seja exercício digitado pelo usuário
  if (/supino|crucifixo|crossover|peck|peito|flex[aã]o/i.test(lower)) return 'peito';
  if (/puxada|remada|costas|dorsal|barra fixa|serrote|pulldown|terra|pullover/i.test(lower)) return 'costas';
  if (/agachamento|leg press|extensora|flexora|stiff|p[eé]lvic|panturrilha|adutora|abdutora|perna|avan[çc]o|passada/i.test(lower)) return 'pernas';
  if (/desenvolvimento|eleva[çc][ãa]o lateral|eleva[çc][ãa]o frontal|ombro|delt[oó]ide|trap[eé]zio|face pull/i.test(lower)) return 'ombros';
  if (/rosca|tr[ií]ceps|b[ií]ceps|bra[çc]o|antebra[çc]o|mergulho/i.test(lower)) return 'bracos';
  if (/abdominal|prancha|infra|crunch|core|roda/i.test(lower)) return 'core';
  return null;
}

// Retorna o HTML da tag de grupo muscular
export function getMuscleBadgeHtml(exerciseName) {
  const muscleId = getExerciseMuscle(exerciseName);
  if (!muscleId) return '';
  const group = MUSCLE_GROUPS.find(g => g.id === muscleId);
  if (!group || group.id === 'todos') return '';
  return `<span class="muscle-tag muscle-${group.id}">${group.label}</span>`;
}

// Chave do localStorage
export const STORAGE_KEY = 'fittrack_data';

// Dados padrão iniciais
export const DEFAULT_DATA = {
  routine: {
    0: { label: '', exercises: [] },
    1: { label: '', exercises: [] },
    2: { label: '', exercises: [] },
    3: { label: '', exercises: [] },
    4: { label: '', exercises: [] },
    5: { label: '', exercises: [] },
    6: { label: '', exercises: [] },
  },
  history: [],
};