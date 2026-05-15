# spec-id: PARITY-03
# rastreabilidade: agent/requirements.md, domain.md §2

@paridade @critico
Funcionalidade: Agent Registry e Detection

  Cenario: Inicializacao com agents disponiveis
    Dado que o sistema possui CLIs no PATH
    Quando AgentRegistry.initialize() e chamado
    Entao detectedAgents contem Gemini e AionRS sempre disponiveis
    E agents ACP detectados via PATH

  Cenario: Deduplicacao de backend
    Dado que builtin e extension detectaram agent com backend="claude"
    Quando merge() e executado
    Entao apenas o agent com maior prioridade permanece

  Cenario: Refresh parcial de extension agents
    Dado que o registry esta inicializado
    E uma extensao registra novo ACP adapter
    Quando refreshExtensionAgents() e chamado
    Entao o novo agent aparece em detectedAgents

  Cenario: CLI detection executa comando
    Dado que o sistema verifica presenca de um agent CLI
    Quando o comando e executado com --help
    Entao a saida e parseada e o agent e registrado