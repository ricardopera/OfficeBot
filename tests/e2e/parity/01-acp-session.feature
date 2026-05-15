# spec-id: PARITY-01
# rastreabilidade: code-analysis.md §2 (ACP Session FSM), target_domain.md AGG-ACP-Session
# paradigma: sem mudança (híbrido OO+DI + Event-driven)

@paridade @critico
Funcionalidade: ACP Session Lifecycle

  Cenario: Spawn e inicializacao de agente ACP
    Dado que um agente ACP esta disponivel no PATH
    Quando o usuario cria uma conversa e envia um prompt
    Entao a sessao transita de idle → starting → active
    E o agente responde com sessionId valido via JSON-RPC

  Cenario: Sessao ociosa e suspensao automatica
    Dado que uma sessao ACP esta no estado "active"
    E passaram mais de 5 minutos sem atividade
    Quando o IdleReclaimer verifica
    Entao a sessao e suspensa automaticamente

  Cenario: Reconexao apos disconnect
    Dado que o processo do agente morre durante um prompt
    Quando o disconnect e detectado
    Entao a sessao entra em "suspended"
    E tenta reconexao com ate 2 retries e backoff exponencial

  Cenario: Shutdown graceful 3 fases
    Dado que uma sessao ACP esta ativa
    Quando close() e chamado
    Entao o shutdown segue stdin.end() → SIGTERM(1500ms) → SIGKILL(1000ms)
    E o processo e terminado sem SIGKILL na maioria dos casos

  Cenario: Sessao resumiu apos suspend
    Dado que uma sessao esta no estado "suspended"
    Quando o IdleReclaimer detecta atividade
    Entao a sessao transita para "active"
    E o contexto e restaurado completamente

  Cenario: Spawn falha retorna erro
    Dado que o PATH nao contem nenhum agente ACP
    Quando o sistema tenta criar sessao
    Entao um erro e retornado com codigo "AGENT_NOT_FOUND"
    E a sessao permanece em "idle"

  Cenario: IdleReclaimer detecta timeout 5min
    Dado que uma sessao esta "active" ha menos de 5 minutos
    Quando o IdleReclaimer executa ciclo
    Entao a sessao nao e suspensa