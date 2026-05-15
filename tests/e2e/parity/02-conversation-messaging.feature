# spec-id: PARITY-02
# rastreabilidade: domain.md §2.2-2.3, bridge/requirements.md BR-02 a BR-07

@paridade @critico
Funcionalidade: Conversation CRUD e Messaging

  Cenario: Criar conversa ACP e enviar mensagem
    Dado que o usuario esta autenticado
    Quando cria uma conversa com type "acp" e envia "Ola"
    Entao a conversa e criada no banco com status "pending"
    E a mensagem e persistida com type "text" e position "right"
    E a resposta do agente e transmitida via streaming

  Cenario: Codex type remapeado
    Dado que o usuario solicita criar conversa com type "codex"
    Quando o bridge processa a requisicao
    Entao type e remapeado para "acp" com extra.backend="codex"

  Cenario: Model change mata task e rebuild
    Dado que uma conversa esta rodando com modelo X
    Quando o usuario troca para modelo Y
    Entao workerTaskManager.kill(id) e chamado
    E a proxima mensagem forca rebuild do task

  Cenario: Lazy migration file→DB
    Dado que uma conversa existe em file storage mas nao no DB
    Quando o renderer solicita get(id)
    Entao a conversa e retornada imediatamente do file storage
    E migrateConversationToDatabase() executa em background

  Cenario: Conversation list retorna ordenacao por updatedAt
    Dado que existem N conversas no banco
    Quando o cliente solicita list
    Entao as conversas sao retornadas ordenadas por updatedAt DESC