/**
 * Cria o cronômetro de descanso e conecta seus controles à interface.
 * O estado fica encapsulado aqui para não misturar o timer ao fluxo das telas.
 */
import { playFinishSound, playShortBeep } from '../utils/dom.js';

export function createTimer({ refs, showToast, shouldShowFloatingTimer = () => true }) {
  let totalSeconds = 60;
  let remainingSeconds = 60;
  let isRunning = false;
  let intervalId = null;

  function updateUI() {
    const {
      restTimerCard, timerStatusLabel, timerSecondsDisplay, timerProgressBar,
      btnTimerToggle, btnTimerToggleIcon, btnTimerToggleText,
      floatingTimer, floatingTimerLabel, floatingTimerVal, btnFloatingToggleIcon,
    } = refs;

    if (timerSecondsDisplay) timerSecondsDisplay.textContent = remainingSeconds;

    const percent = totalSeconds > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100))
      : 0;
    if (timerProgressBar) timerProgressBar.style.width = `${percent}%`;

    if (restTimerCard) {
      restTimerCard.classList.toggle('running', isRunning);
      restTimerCard.classList.toggle('ending', isRunning && remainingSeconds <= 5 && remainingSeconds > 0);
      restTimerCard.classList.toggle('finished', !isRunning && remainingSeconds === 0);
    }

    if (timerStatusLabel) {
      if (isRunning) {
        timerStatusLabel.textContent = remainingSeconds <= 5 ? 'Quase lá!' : 'Descansando...';
      } else if (remainingSeconds === 0) {
        timerStatusLabel.textContent = 'Descanso Concluído!';
      } else if (remainingSeconds < totalSeconds) {
        timerStatusLabel.textContent = 'Pausado';
      } else {
        timerStatusLabel.textContent = 'Cronômetro de Descanso';
      }
    }

    if (btnTimerToggle && btnTimerToggleIcon && btnTimerToggleText) {
      if (isRunning) {
        btnTimerToggleIcon.className = 'ri-pause-fill';
        btnTimerToggleText.textContent = 'Pausar';
        btnTimerToggle.classList.add('is-paused');
      } else {
        btnTimerToggleIcon.className = 'ri-play-fill';
        btnTimerToggleText.textContent = remainingSeconds < totalSeconds && remainingSeconds > 0
          ? 'Retomar'
          : 'Iniciar';
        btnTimerToggle.classList.remove('is-paused');
      }
    }

    if (floatingTimer && floatingTimerVal) {
      floatingTimerVal.textContent = `${remainingSeconds}s`;
      if (btnFloatingToggleIcon) {
        btnFloatingToggleIcon.className = isRunning ? 'ri-pause-line' : 'ri-play-line';
      }
      if (floatingTimerLabel) {
        floatingTimerLabel.textContent = isRunning ? 'Descanso' : 'Pausado';
      }
      floatingTimer.hidden = !shouldShowFloatingTimer()
        || !(isRunning || (remainingSeconds > 0 && remainingSeconds < totalSeconds));
    }
  }

  function clearTimer() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function runInterval() {
    clearTimer();
    intervalId = setInterval(() => {
      remainingSeconds -= 1;

      if (remainingSeconds === 3 || remainingSeconds === 2 || remainingSeconds === 1) {
        playShortBeep(700);
      }

      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        clearTimer();
        isRunning = false;
        playFinishSound();
        showToast('⏰ Descanso finalizado! Hora da próxima série!', 'success');
      }

      updateUI();
    }, 1000);
  }

  function start(seconds) {
    clearTimer();
    totalSeconds = Math.max(1, seconds);
    remainingSeconds = totalSeconds;
    isRunning = true;
    refs.btnPresets?.forEach(button => {
      button.classList.toggle('active', Number(button.dataset.seconds) === seconds);
    });
    updateUI();
    runInterval();
  }

  function pause() {
    clearTimer();
    isRunning = false;
    updateUI();
  }

  function resume() {
    if (remainingSeconds <= 0) remainingSeconds = totalSeconds;
    isRunning = true;
    updateUI();
    runInterval();
  }

  function toggle() {
    if (isRunning) pause();
    else resume();
  }

  function adjust(delta) {
    remainingSeconds = Math.max(0, remainingSeconds + delta);
    if (remainingSeconds > totalSeconds) totalSeconds = remainingSeconds;
    updateUI();
  }

  function reset() {
    clearTimer();
    isRunning = false;
    remainingSeconds = totalSeconds;
    updateUI();
  }

  function cancel() {
    clearTimer();
    isRunning = false;
    remainingSeconds = totalSeconds;
    if (refs.floatingTimer) refs.floatingTimer.hidden = true;
    updateUI();
  }

  function setPreset(seconds, autoStart = false) {
    totalSeconds = seconds;
    remainingSeconds = seconds;
    refs.btnPresets?.forEach(button => {
      button.classList.toggle('active', Number(button.dataset.seconds) === seconds);
    });
    if (autoStart) start(seconds);
    else pause();
  }

  function setupControls() {
    refs.btnPresets?.forEach(button => {
      button.addEventListener('click', () => setPreset(Number(button.dataset.seconds)));
    });
    refs.btnTimerToggle?.addEventListener('click', toggle);
    refs.btnTimerMinus?.addEventListener('click', () => adjust(-15));
    refs.btnTimerPlus?.addEventListener('click', () => adjust(15));
    refs.btnTimerPlus30?.addEventListener('click', () => adjust(30));
    refs.btnTimerReset?.addEventListener('click', reset);

    refs.btnFloatingToggle?.addEventListener('click', event => {
      event.stopPropagation();
      toggle();
    });
    refs.btnFloatingAdd15?.addEventListener('click', event => {
      event.stopPropagation();
      adjust(15);
    });
    refs.btnFloatingClose?.addEventListener('click', event => {
      event.stopPropagation();
      cancel();
    });
  }

  return {
    setupControls,
    updateUI,
    start,
    cancel,
    getState: () => ({ totalSeconds, remainingSeconds, isRunning }),
  };
}
