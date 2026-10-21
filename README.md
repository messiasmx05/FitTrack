<div align="center">

  <img src="public/icon-192.png" alt="FitTrack Logo" width="88" height="88" />

  # ⚡ FitTrack

  **Sua Evolução Começa Aqui — Planejamento de Rotinas, Execução de Treinos e Análise de Carga**

  [![Live Demo](https://img.shields.io/badge/🌐_Acessar_App-fittrack--voo9.onrender.com-6c5ce7?style=for-the-badge)](https://fittrack-voo9.onrender.com)
  [![PWA Ready](https://img.shields.io/badge/📱_PWA-Instalável-00b894?style=for-the-badge)](#)
  [![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com/)
  [![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## 📖 Sobre o Projeto

O **FitTrack** é uma aplicação web Full-Stack e **PWA (Progressive Web App)** desenvolvida para praticantes de musculação que buscam controle preciso sobre seus treinos sem depender de planilhas ou blocos de notas.

Com uma interface moderna em tema escuro (*Dark Mode*), responsiva tanto para **Desktop** quanto para **Celular**, o FitTrack permite planejar divisões semanais, controlar o descanso entre séries em tempo real e visualizar gráficos detalhados de progressão de carga e volume.

🔗 **Acesse agora:** [https://fittrack-voo9.onrender.com](https://fittrack-voo9.onrender.com)

---

## ✨ Principais Funcionalidades

- 📅 **Rotina Semanal Personalizável:**
  - Organização de treinos de Segunda a Domingo com rótulos customizados (ex: *Treino A — Peito e Tríceps*).
  - Catálogo interativo de exercícios separados por grupo muscular (**Peito, Costas, Pernas, Ombros, Braços e Core**).
  - Reordenação rápida de exercícios via *Drag & Drop*.

- 🔥 **Modo Treino ao Vivo & Cronômetro Inteligente:**
  - Destaque automático no exercício em execução, mantendo os próximos na fila e os concluídos compactados.
  - Registro individual de carga (`kg`) e repetições por série.
  - **Cronômetro flutuante de descanso** que dispara automaticamente ao concluir cada série, com alerta sonoro ao término.

- 📈 **Gráficos de Evolução e Métricas:**
  - Acompanhamento visual com **Chart.js** por exercício específico.
  - Três métricas analíticas: **Carga Máxima (Recorde Pessoal / PR)**, **Volume Total da Sessão ($Séries \times Reps \times Carga$)** e **Carga Média**.

- 🗂️ **Histórico Completo & Backup:**
  - Registro cronológico de todas as sessões finalizadas com cálculo automático de tonelagem.
  - Exportação e importação de dados em formato `.json` para backup seguro.

- 🔐 **Autenticação e Sincronização em Nuvem:**
  - Sistema próprio de contas com senhas criptografadas via **Argon2id**.
  - Sessões persistentes em banco de dados **PostgreSQL**, permitindo acessar seus treinos de qualquer dispositivo.

- 📱 **Instalável como Aplicativo (PWA):**
  - Suporte nativo para instalação na tela inicial do **Android, iOS e Desktop**, funcionando em tela cheia como um app nativo.

---

## 🛠️ Tecnologias Utilizadas

### **Front-end**
- **HTML5 & CSS3 Moderno:** Design responsivo com variáveis CSS, *Grid/Flexbox* e aceleração de renderização (`content-visibility`).
- **JavaScript (ES6+ Modules):** Arquitetura limpa, modular e sem sobrecarga de frameworks pesados.
- **Chart.js:** Renderização de gráficos interativos com *tree-shaking* otimizado.
- **Remixicon:** Pacote de ícones vetoriais empacotado localmente para carregamento instantâneo.
- **Vite:** Bundler de alta velocidade para build de produção.

### **Back-end & Segurança**
- **Node.js & Express 5:** API RESTful rápida com compressão HTTP (*Gzip/Brotli*) integrada.
- **PostgreSQL (Supabase):** Persistência relacional e armazenamento JSONB de alta performance com *Row Level Security (RLS)*.
- **Argon2 (`argon2id`):** Algoritmo estado-da-arte para hashing seguro de senhas.
- **Express-Session & Connect-PG-Simple:** Gerenciamento de sessões autenticadas via cookies `HttpOnly`, `Secure` e `SameSite=Lax`.
- **Helmet & Express-Rate-Limit:** Proteção de cabeçalhos HTTP (CSP) e prevenção contra ataques de força bruta.

---

## 📂 Estrutura do Projeto

```text
FitTrack/
├── public/                  # Manifesto PWA, Service Worker (sw.js) e ícones do app
├── server/
│   ├── db.js                # Pool de conexão PostgreSQL e inicialização de tabelas
│   └── index.js             # Servidor Express, rotas de API, autenticação e segurança
├── src/
│   ├── components/          # Componentes modulares (AuthModal, Timer de descanso)
│   ├── data/                # Normalização de schemas e importação/exportação JSON
│   ├── services/            # Clientes de comunicação com a API (auth, userData)
│   ├── styles/              # Arquitetura CSS dividida por páginas, layout e componentes
│   ├── utils/               # Catálogo de exercícios, constantes e helpers de DOM/áudio
│   ├── app.js               # Controlador principal de estado e navegação SPA
│   └── main.js              # Ponto de entrada e registro do Service Worker
├── index.html               # Estrutura principal da interface
├── package.json             # Dependências e scripts de automação
└── vite.config.js           # Configuração de build e proxy de desenvolvimento
```

---

## 🚀 Como Executar Localmente

### **Pré-requisitos**
- [Node.js](https://nodejs.org/) (v20 ou superior)
- Um banco de dados **PostgreSQL** (local ou gratuito no [Supabase](https://supabase.com/))

### **Passo a passo**

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/messiasmx05/FitTrack.git
   cd FitTrack
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.example` para `.env` e preencha os dados do seu banco:
   ```env
   PORT=3001
   NODE_ENV=development
   DATABASE_URL=postgresql://usuario:senha@localhost:5432/fittrack
   DATABASE_SSL=false
   SESSION_SECRET=sua_chave_secreta_com_pelo_menos_32_caracteres
   ```

4. **Inicie o ambiente de desenvolvimento:**
   ```bash
   npm run dev
   ```
   O comando iniciará simultaneamente o servidor da API (`porta 3001`) e o servidor Vite (`http://localhost:3000`).

5. **Build para Produção:**
   ```bash
   npm run build
   npm start
   ```

---

## 👨‍💻 Autor

Desenvolvido com dedicação por **Gabriel Messias**.

<div align="center">
  <sub>Se este projeto foi útil para você, deixe uma ⭐ no repositório!</sub>
</div>
