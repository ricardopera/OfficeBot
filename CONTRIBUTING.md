# 🤝 Contributing to OfficeBot

Obrigado por contribuir! Este documento explica como você pode ajudar a melhorar o OfficeBot.

---

## 📋 Índice

- [Código de Conduta](#-código-de-conduta)
- [Como Contribuir](#-como-contribuir)
- [Setup de Desenvolvimento](#-setup-de-desenvolvimento)
- [Padrões de Código](#-padrões-de-código)
- [Commits](#-commits)
- [Pull Requests](#-pull-requests)
- [Testing](#-testing)
- [Debugging](#-debugging)

---

## 📖 Código de Conduta

Este projeto segue o [Contributor Covenant](https://www.contributor-covenant.org/).
Ao participar, você concorda em manter um ambiente respeitoso para todos.

---

## 🎯 Como Contribuir

### Formas de Contribuir

1. **Reportar Bugs** — Abra uma issue com label `bug`
2. **Sugerir Features** — Abra uma issue com label `enhancement`
3. **Contribuir Código** — Fork → develop → PR
4. **Melhorar Documentação** — PR para `docs/`
5. **Testes** — Adicione parity tests ou unit tests

### Labels Úteis

| Label | Significado |
|---|---|
| `bug` | Bug reportado |
| `enhancement` | Nova funcionalidade |
| `help wanted` | Precisamos de ajuda |
| `good first issue` | Bom para iniciantes |
| `documentation` | Melhorias na docs |
| `question` | Dúvidas |

---

## 🛠️ Setup de Desenvolvimento

### Pré-requisitos

- Node.js 20+
- npm 9+ ou pnpm 8+
- Git

### Clone e Setup

```bash
# Clone o repositório
git clone https://github.com/ricardopera/OfficeBot.git
cd OfficeBot

# Checkout na branch de desenvolvimento
git checkout develop  # ou feat/sua-feature

# Instale dependências
npm install

# Copie o template de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Execute em modo desenvolvimento
npm run dev
```

### Variáveis de Ambiente

```bash
# .env (NÃO commite este arquivo!)
MINIMAX_API_KEY=your-api-key-here
OFFICEBOT_SECRET=your-secret-key
OFFICEBOT_PORT=3000
OFFICEBOT_LOCALE=pt-BR
```

---

## 📐 Padrões de Código

### TypeScript

- Use **TypeScript 5** com strict mode
- Evite `any` — use `unknown` quando o tipo for realmente desconhecido
- Use interfaces para tipos de objetos
- Use type aliases para unions e intersections

```typescript
// ✅ Bom
interface User {
  id: string
  name: string
  email: string
}

// ❌ Evite
const user: any = { ... }
```

### Nomenclatura

| Tipo | Padrão | Exemplo |
|---|---|---|
| Variáveis | camelCase | `userName`, `accessToken` |
| Funções | camelCase | `getUser()`, `createSession()` |
| Classes | PascalCase | `UserRepository`, `AcpSession` |
| Interfaces | PascalCase | `ISqliteDriver`, `IAgentRegistry` |
| Constantes | SCREAMING_SNAKE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Arquivos | kebab-case | `user-repository.ts`, `acp-session.ts` |

### Estrutura de Pastas

```
src/
├── process/          # Lógica de domínio (Node.js)
│   ├── acp/          # Módulo ACP
│   ├── agent/        # Módulo Agent
│   └── ...
├── renderer/         # UI (React)
│   ├── pages/        # Páginas
│   ├── components/   # Componentes
│   └── hooks/        # Hooks customizados
└── common/           # Código compartilhado
    ├── i18n/         # Internacionalização
    ├── security/     # Segurança
    └── types/        # Tipos globais
```

---

## 📝 Commits

### Formato

```
<tipo>(<escopo>): <descrição>

<corpo opcional>

<footer opcional>
```

### Tipos

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `style` | Formatação (sem mudança de lógica) |
| `refactor` | Refatoração (sem mudança de功能) |
| `test` | Adição ou correção de testes |
| `chore` | Tarefas de manutenção |

### Exemplos

```bash
# Bom
git commit -m "feat(agent): add Gemini engine detection"
git commit -m "fix(channels): correct DingTalk webhook signature validation"
git commit -m "docs(readme): add installation instructions"

# Mau
git commit -m "fix stuff"
git commit -m "WIP"
git commit -m "asdasd"
```

### Conventional Commits

Este projeto segue [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(bridge): add ModelConfigBridge for model configuration
fix(acp): resolve session persistence race condition
docs(channels): update Telegram webhook documentation
```

---

## 🔄 Pull Requests

### Fluxo

1. **Fork** o repositório
2. **Crie uma branch** (`git checkout -b feat/minha-feature`)
3. **Commit** suas mudanças (veja Conventional Commits acima)
4. **Push** para a branch (`git push origin feat/minha-feature`)
5. **Abra um PR** no GitHub

### Checklist do PR

- [ ] Branch atualizada com `develop` (ou `main`)
- [ ] Commits seguem Conventional Commits
- [ ] Código passa `npm run lint`
- [ ] Código passa `npm run typecheck`
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada (se necessário)
- [ ] Descrição clara do PR

### Template de PR

```markdown
## Descrição
[Descreva o que este PR faz]

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Issue Relacionada
Fixes #

## Testing
[Descreva como testar esta mudança]

## Checklist
- [ ] Lint passa
- [ ] Typecheck passa
- [ ] Tests passam
```

### tamanhos de PR

| Tamanho | Linhas mudadas | Recomendação |
|---|---|---|
| Pequeno | < 100 | Ideal para review rápido |
| Médio | 100-500 | Okay, mas分段 é melhor |
| Grande | > 500 | Considere dividir em PRs menores |

---

## 🧪 Testing

### Scripts Disponíveis

```bash
# Todos os testes
npm test

# Parity tests (Gherkin)
npm run test:e2e

# Teste com coverage
npm run test:coverage

# Lint
npm run lint

# Typecheck
npm run typecheck
```

### Parity Tests

54 cenários em Gherkin cobrem os fluxos críticos:

```bash
# Executar todos
npm run test:e2e

# Apenas críticos
npm run test:e2e -- --tags @critico

# Cenário específico
npm run test:e2e -- --name "ACP Session lifecycle"
```

### Writing Tests

```gherkin
# tests/e2e/parity/01-acp-session.feature
Feature: ACP Session Lifecycle

  @critico
  Scenario: Session starts and prompts successfully
    Given an authenticated user
    When I start an ACP session with backend "gemini"
    Then the session should be in "active" state
    And I should be able to send a prompt
```

---

## 🔍 Debugging

### Logs

O OfficeBot usa logs estruturados. Configure o nível:

```bash
# development
DEBUG=officebot:* npm run dev

# production
LOG_LEVEL=info npm run start
```

### Commom Issues

**Dependências não instalam:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build falha:**
```bash
npm run clean
npm run build
```

**Porta já em uso:**
```bash
# Encontre o processo na porta
lsof -i :3000

# Mate o processo
kill -9 <PID>

# Ou use outra porta
OFFICEBOT_PORT=3001 npm run dev
```

---

## 📞 Suporte

- **Issues** — Use o GitHub Issues para bugs e features
- **Discusões** — Use GitHub Discussions para dúvidas
- **Chat** — Entre no servidor Discord (se disponível)

---

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas
sob a [MIT License](../LICENSE).

---

<p align="center">
  <strong>Obrigado por contribuir!</strong>
  <br>
  <sub>Feito com 💚 para a comunidade</sub>
</p>