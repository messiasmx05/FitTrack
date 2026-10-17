# FitTrack

Aplicativo web para planejar treinos, registrar sessões e acompanhar a evolução.

## Como executar

1. Instale o [Node.js](https://nodejs.org/).
2. Crie um PostgreSQL local e copie `.env.example` para `.env`; preencha `DATABASE_URL` e `SESSION_SECRET` (mínimo de 32 caracteres).
3. Execute `npm install` na primeira vez.
4. Execute `npm run dev` e abra `http://localhost:3000`. Esse comando inicia a API e o Vite.

Para gerar a versão de produção, execute `npm run build`. O servidor Express (`npm start`) serve a pasta `dist/` e a API no mesmo domínio.

Use `npm run dev` para executar a interface e a API juntas. O Live Server e a abertura direta de `index.html` não funcionam com a autenticação, pois as chamadas à API precisam passar pelo proxy do Vite.

## Organização

- `index.html`: estrutura das telas.
- `src/main.js`: entrada JavaScript da aplicação.
- `style.css`: ponto de entrada dos estilos, carregado pelo HTML.
- `src/app.js`: coordena as páginas, navegação e fluxo principal.
- `src/data/`: validação e importação/exportação de dados.
- `src/services/api.js`: comunicação HTTP com a API no mesmo domínio.
- `src/services/userData.js`: leitura e gravação dos treinos pelo servidor.
- `src/services/auth.js`: validação de formulários, chamadas de cadastro/login e migração de dados locais antigos.
- `src/services/legacyDb.js`: migração de dados da versão antiga baseada em IndexedDB.
- `src/components/`: componentes reutilizáveis, como o cronômetro e a interface de autenticação.
- `src/utils/`: constantes e funções auxiliares.
- `src/styles/`: folha de estilos dividida por layout, página e componente.
- `server/index.js`: API Express, sessões, autenticação, proteção de rotas e servidor de produção.
- `server/db.js`: conexão e criação das tabelas do PostgreSQL.

## Contas e armazenamento

O cadastro, login e dados do FitTrack são processados no servidor Express e armazenados no PostgreSQL. As senhas são derivadas com Argon2id; não são salvas em texto puro. A sessão usa um cookie `HttpOnly`, `Secure` em produção e `SameSite=Lax`. As requisições que alteram dados verificam a origem. O servidor aplica limite de tentativas de autenticação e valida os dados antes de persistir.

O backend local exige PostgreSQL. Em produção, defina `NODE_ENV=production`, `DATABASE_URL`, um `SESSION_SECRET` aleatório com pelo menos 32 caracteres e `APP_ORIGIN` com a origem HTTPS exata do site (sem barra no final). Defina `DATABASE_SSL=true` apenas quando o provedor exigir TLS e apresentar um certificado confiável; conexões internas privadas do Render normalmente usam `DATABASE_SSL=false`. Use uma hospedagem Node que execute o servidor Express e um PostgreSQL gerenciado com armazenamento persistente. O endpoint `/api/health` verifica se o banco está acessível.

No primeiro cadastro remoto neste navegador, dados antigos compatíveis no `localStorage` ou na conta local ativa do IndexedDB são enviados para a nova conta e validados pelo servidor. A migração é marcada como concluída para evitar copiar os mesmos dados pessoais para outra conta criada depois neste navegador. Antes de trocar de domínio, exporte um backup: o IndexedDB é isolado por origem e não pode ser lido automaticamente por outro domínio.

### Publicar com Render e PostgreSQL

1. Envie o projeto para um repositório Git privado.
2. No Render, crie um PostgreSQL gerenciado e um Web Service Node ligado ao repositório.
3. Configure o comando de build como `npm ci && npm run build` e o comando de inicialização como `npm start`.
4. No serviço web, configure `DATABASE_URL` com a URL interna do PostgreSQL, `DATABASE_SSL=false`, `NODE_ENV=production` e `SESSION_SECRET` como um segredo aleatório. Configure `APP_ORIGIN` com a origem HTTPS exata do domínio Render (ou domínio próprio), sem barra final.
5. Aguarde `/api/health` retornar `{"status":"ok"}` antes de abrir o site.

Não publique `.env` nem coloque `DATABASE_URL`/`SESSION_SECRET` em código, Git ou configurações do cliente. Faça backup do PostgreSQL e use um plano que mantenha os dados persistentes.

## JavaScript e TypeScript

O projeto continua escrito em JavaScript. TypeScript não foi ativado; comentários JSDoc podem documentar os dados e ajudar ferramentas como o VS Code a sugerir propriedades e detectar alguns erros, sem exigir que você aprenda uma sintaxe nova agora.
