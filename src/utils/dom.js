/**
 * FitTrack — DOM Utilities
 * Helpers para seleção e manipulação do DOM.
 */

// Seleciona o primeiro elemento que corresponde ao seletor
export const $ = (selector, context = document) => context.querySelector(selector);

// Seleciona todos os elementos que correspondem ao seletor
export const $$ = (selector, context = document) => context.querySelectorAll(selector);

/**
 * Escapa HTML para prevenir XSS ao inserir strings em templates
 * @param {string} str - String a ser escapada
 * @returns {string} String com caracteres HTML escapados
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Gera um ID curto único baseado em timestamp + random
 * @returns {string} ID único
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Formata data como AAAA-MM-DD para nomes de arquivo
 * @param {Date} d - Data a formatar
 * @returns {string} Data formatada
 */
export function formatDateFile(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Toca um bip curto via Web Audio API
 * @param {number} freq - Frequência em Hz
 */
export function playShortBeep(freq = 700) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Silencioso - áudio não é crítico
  }
}

/**
 * Toca som de finalização (dois bips)
 */
export function playFinishSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Primeiro bip
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.2);

    // Segundo bip (mais agudo)
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1175;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.35, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.35);
      } catch (err) {}
    }, 180);
  } catch (e) {
    // Silencioso
  }
}