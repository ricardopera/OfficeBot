# spec-id: PARITY-09
# rastreabilidade: bridge/requirements.md BR-01 a BR-17

@paridade @critico
Funcionalidade: IPC Bridge Communication

  Cenario: Provider request/response
    Dado que o renderer chama ipcBridge.conversation.create
    Quando a chamada passa por preload → ipcMain.handle()
    Entao o bridge handler executa e retorna via Promise chain

  Cenario: Payload maximo 50MB
    Dado que um evento bridge excede 50MB apos JSON.stringify
    Quando o adapter tenta serializar
    Entao o evento e dropped
    E evento bridge:error e enviado

  Cenario: WebSocket auto-reconnect
    Dado que a conexao WebSocket foi fechada normalmente
    Quando shouldReconnect=true
    Entao scheduleReconnect agenda com delay exponencial
    E message queue e esvaziada apos OPEN

  Cenario: Model change detection
    Dado que o renderer detecta mudanca de modelo
    Quando notifyModelChange() e chamado
    Entao o ipcBridge notifica todos os handlers
    E o state e atualizado corretamente

  Cenario: Provider failure retorna erro estruturado
    Dado que o bridge handler encontra erro no provider
    Quando a excecao e lancada
    Entao um objeto de erro e retornado com code e message