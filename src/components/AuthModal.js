/**
 * FitTrack — Componente de Autenticação (Login e Cadastro)
 * Controla a renderização, alternância de formulários, validações visuais
 * e integração com as funções seguras de autenticação.
 */

import { loginUser, registerUser, evaluatePasswordStrength } from '../services/auth.js';
import { escapeHtml } from '../utils/dom.js';

export function createAuthModal({ container, onAuthSuccess, showToast }) {
  let activeTab = 'login'; // 'login' ou 'register'
  let isSubmitting = false;

  function render() {
    container.innerHTML = `
      <div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <div class="auth-header">
          <div class="auth-brand">
            <i class="ri-flashlight-fill"></i>
            <span>FitTrack</span>
          </div>
          <h2 class="auth-title" id="authTitle">
            ${activeTab === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </h2>
          <p class="auth-subtitle" id="authSubtitle">
            ${activeTab === 'login'
              ? 'Entre para acessar seus treinos, cargas e evolução'
              : 'Comece a registrar sua rotina e conquiste resultados'}
          </p>
        </div>

        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab-btn ${activeTab === 'login' ? 'active' : ''}"
            id="tabLogin" role="tab" aria-selected="${activeTab === 'login'}">
            <i class="ri-login-box-line"></i> Entrar
          </button>
          <button type="button" class="auth-tab-btn ${activeTab === 'register' ? 'active' : ''}"
            id="tabRegister" role="tab" aria-selected="${activeTab === 'register'}">
            <i class="ri-user-add-line"></i> Criar Conta
          </button>
        </div>

        <div id="authAlertArea"></div>

        <!-- Formulário de Login -->
        <form class="auth-form" id="formLogin" ${activeTab !== 'login' ? 'hidden' : ''} novalidate>
          <div class="auth-field">
            <label for="loginEmail">E-mail</label>
            <div class="auth-input-wrapper">
              <input type="email" id="loginEmail" class="auth-input"
                placeholder="seu.email@exemplo.com" required autocomplete="username">
              <i class="ri-mail-line auth-input-icon"></i>
            </div>
          </div>

          <div class="auth-field">
            <label for="loginPassword">Senha</label>
            <div class="auth-input-wrapper">
              <input type="password" id="loginPassword" class="auth-input"
                placeholder="••••••••" required autocomplete="current-password">
              <i class="ri-lock-2-line auth-input-icon"></i>
              <button type="button" class="auth-toggle-pass" id="btnToggleLoginPass"
                title="Mostrar ou ocultar senha" aria-label="Mostrar senha">
                <i class="ri-eye-line"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-auth-submit" id="btnSubmitLogin">
            <i class="ri-login-box-line"></i>
            <span>Entrar no FitTrack</span>
          </button>

          <div class="auth-footer">
            <span>Ainda não possui conta?</span>
            <button type="button" class="auth-switch-link" id="linkToRegister">
              Cadastre-se grátis
            </button>
          </div>
        </form>

        <!-- Formulário de Cadastro -->
        <form class="auth-form" id="formRegister" ${activeTab !== 'register' ? 'hidden' : ''} novalidate>
          <div class="auth-field">
            <label for="regName">Nome Completo</label>
            <div class="auth-input-wrapper">
              <input type="text" id="regName" class="auth-input"
                placeholder="Gabriel Silva" required maxlength="70" autocomplete="name">
              <i class="ri-user-3-line auth-input-icon"></i>
            </div>
          </div>

          <div class="auth-field">
            <label for="regEmail">E-mail</label>
            <div class="auth-input-wrapper">
              <input type="email" id="regEmail" class="auth-input"
                placeholder="seu.email@exemplo.com" required maxlength="254" autocomplete="email">
              <i class="ri-mail-line auth-input-icon"></i>
            </div>
          </div>

          <div class="auth-field">
            <label for="regPassword">Senha Segura</label>
            <div class="auth-input-wrapper">
              <input type="password" id="regPassword" class="auth-input"
                placeholder="Mínimo de 8 caracteres" required minlength="8" maxlength="100" autocomplete="new-password">
              <i class="ri-lock-2-line auth-input-icon"></i>
              <button type="button" class="auth-toggle-pass" id="btnToggleRegPass"
                title="Mostrar ou ocultar senha" aria-label="Mostrar senha">
                <i class="ri-eye-line"></i>
              </button>
            </div>
            <div class="password-meter" id="passwordMeter">
              <div class="password-meter-bar">
                <div class="password-meter-fill" id="passMeterFill"></div>
              </div>
              <div class="password-meter-text">
                <span id="passMeterLabel">Força da senha</span>
                <span id="passMeterHint">Mínimo 8 caracteres</span>
              </div>
            </div>
          </div>

          <div class="auth-field">
            <label for="regPasswordConfirm">Confirmar Senha</label>
            <div class="auth-input-wrapper">
              <input type="password" id="regPasswordConfirm" class="auth-input"
                placeholder="Repita sua senha" required autocomplete="new-password">
              <i class="ri-shield-check-line auth-input-icon"></i>
              <button type="button" class="auth-toggle-pass" id="btnToggleRegConfirmPass"
                title="Mostrar ou ocultar senha" aria-label="Mostrar senha">
                <i class="ri-eye-line"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-auth-submit" id="btnSubmitRegister">
            <i class="ri-user-add-line"></i>
            <span>Criar Minha Conta</span>
          </button>

          <div class="auth-footer">
            <span>Já tem uma conta?</span>
            <button type="button" class="auth-switch-link" id="linkToLogin">
              Fazer Login
            </button>
          </div>
        </form>

        <p class="auth-storage-note">
          <i class="ri-information-line"></i>
          Sua conta e seus treinos são salvos com segurança no servidor.
        </p>
      </div>
    `;

    setupEvents();
  }

  function showAlert(message, type = 'error') {
    const area = container.querySelector('#authAlertArea');
    if (!area) return;
    area.innerHTML = `
      <div class="auth-alert ${type}" role="alert">
        <i class="${type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function clearAlert() {
    const area = container.querySelector('#authAlertArea');
    if (area) area.innerHTML = '';
  }

  function setTab(tab) {
    activeTab = tab;
    clearAlert();
    render();
    const firstInput = activeTab === 'login'
      ? container.querySelector('#loginEmail')
      : container.querySelector('#regName');
    firstInput?.focus();
  }

  function togglePasswordVisibility(inputId, buttonEl) {
    const input = container.querySelector(`#${inputId}`);
    if (!input || !buttonEl) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    const icon = buttonEl.querySelector('i');
    if (icon) {
      icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
    }
  }

  function setupEvents() {
    // Abas
    container.querySelector('#tabLogin')?.addEventListener('click', () => setTab('login'));
    container.querySelector('#tabRegister')?.addEventListener('click', () => setTab('register'));

    // Links de alternância
    container.querySelector('#linkToRegister')?.addEventListener('click', () => setTab('register'));
    container.querySelector('#linkToLogin')?.addEventListener('click', () => setTab('login'));

    // Alternar visibilidade de senhas
    container.querySelector('#btnToggleLoginPass')?.addEventListener('click', (e) => {
      togglePasswordVisibility('loginPassword', e.currentTarget);
    });
    container.querySelector('#btnToggleRegPass')?.addEventListener('click', (e) => {
      togglePasswordVisibility('regPassword', e.currentTarget);
    });
    container.querySelector('#btnToggleRegConfirmPass')?.addEventListener('click', (e) => {
      togglePasswordVisibility('regPasswordConfirm', e.currentTarget);
    });

    // Medidor de força da senha no cadastro
    const regPassInput = container.querySelector('#regPassword');
    const meterFill = container.querySelector('#passMeterFill');
    const meterLabel = container.querySelector('#passMeterLabel');

    regPassInput?.addEventListener('input', () => {
      const evaluation = evaluatePasswordStrength(regPassInput.value);
      if (meterFill && meterLabel) {
        if (!regPassInput.value) {
          meterFill.style.width = '0%';
          meterFill.style.backgroundColor = 'transparent';
          meterLabel.textContent = 'Força da senha';
          meterLabel.style.color = 'var(--text-dim)';
        } else {
          const widthMap = { 1: '33%', 2: '66%', 3: '100%' };
          meterFill.style.width = widthMap[evaluation.score] || '0%';
          meterFill.style.backgroundColor = evaluation.color;
          meterLabel.textContent = `Força: ${evaluation.label}`;
          meterLabel.style.color = evaluation.color;
        }
      }
    });

    // Envio do Login
    const formLogin = container.querySelector('#formLogin');
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const email = container.querySelector('#loginEmail')?.value.trim();
      const password = container.querySelector('#loginPassword')?.value;

      clearAlert();

      if (!email || !password) {
        showAlert('Preencha seu e-mail e senha.');
        return;
      }

      const submitBtn = container.querySelector('#btnSubmitLogin');
      try {
        isSubmitting = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i><span>Entrando...</span>';
        }

        const user = await loginUser({ email, password });
        if (onAuthSuccess) await onAuthSuccess(user);
        hide();
        showToast(`Bem-vindo de volta, ${user.name}! 💪`, 'success');
      } catch (err) {
        showAlert(err.message || 'Erro ao realizar login.');
      } finally {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="ri-login-box-line"></i><span>Entrar no FitTrack</span>';
        }
      }
    });

    // Envio do Cadastro
    const formRegister = container.querySelector('#formRegister');
    formRegister?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const name = container.querySelector('#regName')?.value.trim();
      const email = container.querySelector('#regEmail')?.value.trim();
      const password = container.querySelector('#regPassword')?.value;
      const confirmPassword = container.querySelector('#regPasswordConfirm')?.value;

      clearAlert();

      if (!name) {
        showAlert('Informe seu nome completo.');
        container.querySelector('#regName')?.focus();
        return;
      }

      if (!email) {
        showAlert('Informe um e-mail válido.');
        container.querySelector('#regEmail')?.focus();
        return;
      }

      if (!password || password.length < 8) {
        showAlert('A senha deve ter pelo menos 8 caracteres.');
        container.querySelector('#regPassword')?.focus();
        return;
      }

      if (password !== confirmPassword) {
        showAlert('As senhas não conferem. Digite a mesma senha nos dois campos.');
        container.querySelector('#regPasswordConfirm')?.focus();
        return;
      }

      const submitBtn = container.querySelector('#btnSubmitRegister');
      try {
        isSubmitting = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i><span>Criando conta segura...</span>';
        }

        const user = await registerUser({ name, email, password });
        if (onAuthSuccess) await onAuthSuccess(user);
        hide();
        showToast(`Conta criada com sucesso! Seja bem-vindo, ${user.name}! 🚀`, 'success');
      } catch (err) {
        showAlert(err.message || 'Erro ao realizar cadastro.');
      } finally {
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="ri-user-add-line"></i><span>Criar Minha Conta</span>';
        }
      }
    });
  }

  function show(tab = 'login') {
    container.hidden = false;
    document.body.style.overflow = 'hidden';
    setTab(tab);
  }

  function setError(message) {
    container.hidden = false;
    if (!container.querySelector('#authTitle')) render();
    showAlert(message);
  }

  function hide() {
    container.hidden = true;
    document.body.style.overflow = '';
    clearAlert();
  }

  return {
    show,
    hide,
    setTab,
    setError,
  };
}
