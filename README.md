<div align="center">
  <h1>🤖 OfficeBot</h1>
  <p><strong>Seu colega de trabalho com IA integrada</strong></p>
  <p>Um assistente inteligente para escritório, desenvolvido com Electron, React e modelos de linguagem de grande escala (LLMs). Automatize tarefas, gerencie arquivos, analise documentos e muito mais — tudo a partir de uma interface de chat natural.</p>

  <p>
    <a href="https://github.com/ricardopera/OfficeBot/releases/latest"><img src="https://img.shields.io/github/v/release/ricardopera/OfficeBot?style=flat-square&logo=github" alt="Latest Release" /></a>
    <a href="https://github.com/ricardopera/OfficeBot/releases"><img src="https://img.shields.io/github/downloads/ricardopera/OfficeBot/total?style=flat-square" alt="Downloads" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/ricardopera/OfficeBot?style=flat-square" alt="License" /></a>
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue?style=flat-square" alt="Platform" />
  </p>
</div>

---

## ✨ Funcionalidades

| Categoria | Funcionalidades |
|-----------|----------------|
| 🧠 **IA & Chat** | Conversas com LLMs via OpenAI e provedores compatíveis, streaming de respostas, histórico de conversas, favoritos |
| 📄 **Documentos** | Leitura de PDF, Word (.docx), planilhas Excel (leitura e escrita), geração de relatórios em HTML/PDF |
| 📊 **Gráficos** | Geração de gráficos com Chart.js (bar, line, pie, etc.) a partir de dados ou instruções em linguagem natural |
| 📁 **Sistema de Arquivos** | Navegar, ler, escrever, editar e renomear arquivos; busca por glob e grep; abertura de workspace |
| 🖥️ **Terminal Integrado** | Terminal interativo (node-pty/xterm) com múltiplas sessões |
| 🔧 **Execução de Comandos** | Execução de comandos shell com controle de aprovação configurável |
| 🌐 **Busca na Web** | Pesquisa via Tavily API ou Brave Search API |
| 💾 **Memória** | Persistência de memórias por tipo: usuário, projeto, feedback, referência |
| ⚙️ **Configurações** | Tema (claro/escuro/sistema), idioma (pt-BR / en), tamanho de fonte, modo de aprovação, instruções personalizadas |
| 🔐 **Segurança** | Modo de aprovação para ações sensíveis (safe / semi-auto / yolo / custom) |

---

## 📥 Instalação

### Windows

1. Acesse a [página de releases](https://github.com/ricardopera/OfficeBot/releases/latest)
2. Baixe o arquivo **`OfficeBot-Setup-X.X.X.exe`** (instalador NSIS) ou **`OfficeBot-X.X.X.msi`**
3. Execute o instalador e siga as instruções
4. Inicie o OfficeBot pelo menu Iniciar ou atalho na área de trabalho

### Linux

#### AppImage (recomendado — qualquer distribuição)

```bash
chmod +x OfficeBot-X.X.X.AppImage
./OfficeBot-X.X.X.AppImage
```

#### Debian / Ubuntu (.deb)

```bash
sudo dpkg -i OfficeBot-*.deb
sudo apt-get install -f   # instala dependências faltantes, se necessário
officebot
```

---

## 🚀 Primeiros Passos

1. **Configure um provedor de LLM**
   - Abra as configurações (ícone de engrenagem ou atalho `Ctrl+,`)
   - Na aba **Provedores**, clique em **Adicionar Provedor**
   - Informe sua chave de API (OpenAI, OpenRouter, LM Studio, Ollama etc.)
   - Selecione o modelo padrão e salve

2. **Abra um Workspace** (opcional)
   - Clique em **Abrir Pasta** para definir o diretório de trabalho
   - O agente terá acesso somente aos arquivos dentro deste diretório

3. **Inicie uma Conversa**
   - Clique em **Nova Conversa** no painel lateral
   - Digite sua mensagem e pressione **Enter** ou clique em **Enviar**

4. **Explore as ferramentas**
   - O agente pode executar ferramentas automaticamente: ler arquivos, rodar scripts, gerar gráficos, pesquisar na web e mais
   - O **modo de aprovação** controla quais ações precisam de sua confirmação

---

## 🔧 Desenvolvimento

### Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20
- npm >= 9
- **Windows:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (para módulos nativos)
- **Linux:** `build-essential`, `python3`, `libsecret-1-dev`

```bash
# Linux — instalar dependências de build
sudo apt-get install -y build-essential python3 libsecret-1-dev
```

### Configuração do Ambiente

```bash
# 1. Clone o repositório
git clone https://github.com/ricardopera/OfficeBot.git
cd OfficeBot

# 2. Instale as dependências
npm install

# 3. Inicie em modo de desenvolvimento
npm run dev
```

### Comandos Úteis

```bash
# Modo desenvolvimento (hot reload)
npm run dev

# Executar testes
npm test

# Verificar tipos TypeScript
npm run typecheck

# Build de produção
npm run build

# Gerar instaladores (requer ícones — veja abaixo)
npm run package:linux   # Linux: AppImage + .deb
npm run package:win     # Windows: .exe + .msi  (execute em Windows)
```

### Gerando Ícones

Os ícones são gerados automaticamente antes do empacotamento:

```bash
# Gerar ícones manualmente (requer sharp — já incluído como dependência)
npm run create-icons
```

Os arquivos `resources/icon.png` e `resources/icon.ico` serão criados.

---

## 🏗️ Arquitetura

```
OfficeBot/
├── src/
│   ├── main/                 # Processo principal Electron
│   │   ├── agent/            # Motor do agente de IA
│   │   │   ├── AgentLoop.ts  # Loop de execução do agente
│   │   │   ├── ApprovalEngine.ts
│   │   │   ├── SystemPrompt.ts
│   │   │   └── tools/        # Ferramentas disponíveis ao agente
│   │   │       ├── fs/       # Arquivo: read, write, edit, glob, grep
│   │   │       ├── office/   # Excel, Word, PDF, relatórios, gráficos
│   │   │       ├── web/      # Busca na internet
│   │   │       └── bash.ts   # Execução de comandos shell
│   │   ├── ipc/              # Handlers IPC main ↔ renderer
│   │   ├── providers/        # Provedores de LLM
│   │   └── services/         # DB (SQLite), FileSystem, Terminal
│   ├── preload/              # Scripts de preload (bridge IPC seguro)
│   ├── renderer/             # Interface React
│   │   ├── components/       # Chat, editor, arquivos, terminal, layout
│   │   ├── stores/           # Estado global (Zustand)
│   │   ├── hooks/            # React hooks customizados
│   │   └── i18n/             # Internacionalização (pt-BR / en)
│   └── shared/               # Tipos, canais IPC e constantes compartilhados
├── resources/                # Ícones e recursos de build
├── scripts/                  # Scripts utilitários
├── tests/                    # Testes unitários (Vitest)
├── electron-builder.yml      # Configuração de empacotamento
└── electron.vite.config.ts   # Configuração do build (electron-vite)
```

---

## ⚙️ Variáveis de Configuração

As configurações são armazenadas localmente via Electron's `app.getPath('userData')` e podem ser ajustadas na tela de **Configurações**:

| Configuração | Descrição | Padrão |
|---|---|---|
| `language` | Idioma da interface | `pt-BR` |
| `theme` | Tema visual | `system` |
| `fontSize` | Tamanho da fonte | `14` |
| `approvalMode` | Modo de aprovação de ações | `semi-auto` |
| `tavilyApiKey` | Chave Tavily (busca web) | — |
| `braveApiKey` | Chave Brave Search (busca web) | — |
| `customInstructions` | Instruções personalizadas para o agente | — |

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faça commit das alterações: `git commit -m 'feat: adiciona minha feature'`
4. Envie para o fork: `git push origin feature/minha-feature`
5. Abra um Pull Request

Por favor, certifique-se de que os testes passam (`npm test`) antes de submeter.

---

## 🏷️ Publicando a primeira release

O workflow de release (`.github/workflows/release.yml`) publica automaticamente os instaladores de Windows e Linux quando uma tag semântica é enviada.

```bash
git tag v1.0.0
git push origin v1.0.0
```

Após o push da tag:
- Será executado build em `ubuntu-latest` (AppImage + .deb)
- Será executado build em `windows-latest` (.exe + .msi)
- Os artefatos serão anexados automaticamente na Release `v1.0.0`

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
  <p>Desenvolvido com ❤️ — <strong>OfficeBot</strong></p>
</div>
