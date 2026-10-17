/**
 * FitTrack — Dados e backups
 * Normaliza dados para a API e importa/exporta backups JSON.
 */

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumericInput(value) {
  return (typeof value === 'number' || typeof value === 'string')
    && !(typeof value === 'string' && value.trim() === '');
}

function toNonNegativeNumber(value, fallback, fieldName, strict) {
  const number = Number(value);
  if (isNumericInput(value) && Number.isFinite(number) && number >= 0) return number;
  if (strict) throw new Error(`O campo "${fieldName}" deve ser um número igual ou maior que zero.`);
  return fallback;
}

function normalizeExercise(exercise, strict) {
  if (!isRecord(exercise) || typeof exercise.name !== 'string'
    || !exercise.name.trim() || exercise.name.trim().length > 100) {
    if (strict) throw new Error('Foi encontrado um exercício inválido no arquivo.');
    return null;
  }

  const sets = Number(exercise.sets);
  if (!isNumericInput(exercise.sets) || !Number.isInteger(sets) || sets < 1 || sets > 100) {
    if (strict) throw new Error(`O número de séries de "${exercise.name}" deve estar entre 1 e 100.`);
  }

  const repsValue = exercise.reps ?? '12';
  if (strict && typeof repsValue !== 'string' && typeof repsValue !== 'number') {
    throw new Error(`As repetições de "${exercise.name}" são inválidas.`);
  }
  const reps = String(repsValue).trim();
  if (!reps || reps.length > 20) {
    if (strict) throw new Error(`As repetições de "${exercise.name}" são inválidas.`);
  }

  const restValue = exercise.rest ?? 60;
  const rest = Number(restValue);
  if (!isNumericInput(restValue) || !Number.isInteger(rest) || rest < 1 || rest > 3600) {
    if (strict) throw new Error(`O descanso de "${exercise.name}" deve estar entre 1 e 3600 segundos.`);
  }

  return {
    id: typeof exercise.id === 'string' && exercise.id ? exercise.id : createId(),
    name: exercise.name.trim(),
    sets: Number.isInteger(sets) && sets >= 1 && sets <= 100 ? sets : 3,
    reps: reps && reps.length <= 20 ? reps : '12',
    weight: toNonNegativeNumber(exercise.weight ?? 0, 0, 'carga', strict),
    rest: Number.isInteger(rest) && rest >= 1 && rest <= 3600 ? rest : 60,
  };
}

function normalizeHistoryExercise(exercise, strict) {
  if (!isRecord(exercise) || typeof exercise.name !== 'string' || !exercise.name.trim()
    || !Array.isArray(exercise.sets)) {
    if (strict) throw new Error('Foi encontrado um exercício de histórico inválido.');
    return null;
  }

  const sets = [];
  for (const set of exercise.sets) {
    if (!isRecord(set)) {
      if (strict) throw new Error(`As séries de "${exercise.name}" são inválidas.`);
      continue;
    }
    const weight = Number(set.weight);
    const reps = Number(set.reps);
    const hasValidTypes = isNumericInput(set.weight) && isNumericInput(set.reps);
    if (!hasValidTypes || !Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 0) {
      if (strict) throw new Error(`As séries de "${exercise.name}" contêm valores inválidos.`);
      continue;
    }
    sets.push({ weight, reps });
  }

  return { name: exercise.name.trim(), sets };
}

function normalizeSession(session, strict) {
  if (!isRecord(session) || !Array.isArray(session.exercises)) {
    if (strict) throw new Error('Foi encontrada uma sessão de histórico inválida.');
    return null;
  }

  const date = new Date(session.date);
  if ((strict && (typeof session.date !== 'string' || !session.date.trim()))
    || !Number.isFinite(date.getTime())) {
    if (strict) throw new Error('Uma sessão contém uma data inválida.');
    return null;
  }

  const exercises = session.exercises
    .map(exercise => normalizeHistoryExercise(exercise, strict))
    .filter(Boolean);
  const dayOfWeek = Number(session.dayOfWeek);
  if (strict && session.dayOfWeek !== undefined
    && (!isNumericInput(session.dayOfWeek) || !Number.isInteger(dayOfWeek)
      || dayOfWeek < 0 || dayOfWeek > 6)) {
    throw new Error('Uma sessão contém um dia da semana inválido.');
  }
  const fallbackDay = date.getDay();

  return {
    id: typeof session.id === 'string' && session.id ? session.id : createId(),
    date: date.toISOString(),
    dayOfWeek: Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6
      ? dayOfWeek
      : fallbackDay,
    dayLabel: typeof session.dayLabel === 'string' && session.dayLabel.trim()
      ? session.dayLabel.trim()
      : `Treino de ${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][fallbackDay]}`,
    exercises,
  };
}

/**
 * Valida e completa a estrutura dos dados, mantendo compatibilidade com backups antigos.
 * @param {unknown} source Dados carregados ou importados.
 * @param {{strict?: boolean}} options No modo estrito, dados inválidos são rejeitados.
 * @returns {Object} Dados normalizados do FitTrack.
 */
export function normalizeData(source, { strict = false } = {}) {
  if (!isRecord(source)) {
    throw new Error('O conteúdo precisa ser um objeto JSON.');
  }

  if (strict && (!isRecord(source.routine) || !Array.isArray(source.history))) {
    throw new Error('O backup deve conter uma rotina e um histórico válidos.');
  }

  const routineSource = isRecord(source.routine) ? source.routine : {};
  const routine = {};
  for (let day = 0; day <= 6; day += 1) {
    const daySource = routineSource[day];
    if (daySource === undefined) {
      routine[day] = { label: '', exercises: [] };
      continue;
    }
    if (!isRecord(daySource) || !Array.isArray(daySource.exercises)) {
      if (strict) throw new Error(`A rotina do dia ${day} é inválida.`);
      routine[day] = { label: '', exercises: [] };
      continue;
    }
    const exerciseIds = new Set();
    const exercises = daySource.exercises
      .map(exercise => normalizeExercise(exercise, strict))
      .filter(Boolean)
      .map(exercise => {
        if (exerciseIds.has(exercise.id)) {
          if (strict) throw new Error(`Há identificadores repetidos na rotina do dia ${day}.`);
          exercise.id = createId();
        }
        exerciseIds.add(exercise.id);
        return exercise;
      });
    routine[day] = {
      label: typeof daySource.label === 'string' ? daySource.label : '',
      exercises,
    };
  }

  const historySource = Array.isArray(source.history) ? source.history : [];
  const history = historySource
    .map(session => normalizeSession(session, strict))
    .filter(Boolean);

  return { routine, history };
}

function createId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Exporta dados como blob JSON
 * @param {Object} data - Dados a exportar
 * @returns {Blob} Blob do arquivo JSON
 */
export function exportData(data) {
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

/**
 * Importa e valida dados de um arquivo
 * @param {File} file - Arquivo JSON
 * @returns {Promise<Object>} Dados importados e validados
 */
export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result);
        resolve(normalizeData(imported, { strict: true }));
      } catch (err) {
        reject(err instanceof Error
          ? new Error(`Arquivo inválido: ${err.message}`)
          : new Error('Arquivo inválido. Verifique o formato JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}