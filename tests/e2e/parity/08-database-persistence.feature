# spec-id: PARITY-08
# rastreabilidade: database/requirements.md DB-01 a DB-17

@paridade @critico
Funcionalidade: Database Persistence

  Cenario: Corruption recovery
    Dado que o arquivo SQLite esta corrompido (SQLITE_CORRUPT)
    Quando OfficeBotDatabase.create() e chamado
    Entao o arquivo corrompido e renomeado para backup
    E um novo DB vazio e criado com schema completo

  Cenario: WAL mode e busy_timeout
    Dado que o banco esta em WAL mode com busy_timeout 5000ms
    Quando duas operacoes concurrentes acessam o banco
    Entao ambas completam sem erro de lock

  Cenario: StreamingMessageBuffer flush
    Dado que 20 chunks sao acumulados em accumulate mode
    Entao flushBuffer e chamado imediatamente
    E a mensagem e upsertada no banco

  Cenario: System user default criado
    Dado que e a primeira inicializacao
    Quando initSchema() roda
    Entao "system_default_user" e inserido com INSERT OR IGNORE

  Cenario: StreamingMessageBuffer cleanup no shutdown
    Dado que o buffer tem chunks pendentes
    Quando closeDatabase() e chamado
    Entao o buffer e limpo antes do close
    E nenhum flush pendente permanece

  Cenario: Conversation delete cascade
    Dado que uma conversa existe com M mensagens
    Quando a conversa e deletada
    Entao todas as M mensagens sao removidas em cascade