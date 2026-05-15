# spec-id: PARITY-04
# rastreabilidade: channels/requirements.md CH-01 a CH-12

@paridade @critico
Funcionalidade: Channel Pairing e Streaming

  Cenario: Pairing de usuario
    Dado que usuario nao autorizado envia mensagem no Telegram
    Entao o sistema gera codigo de 6 digitos
    E o codigo expira em 10 minutos

  Cenario: Streaming com throttle 500ms
    Dado que um usuario autorizado com sessao ativa envia mensagem
    Quando a resposta AI chega em streaming
    Entao updates sao enviados a cada 500ms maximo

  Cenario: Midia dentro do workspace
    Dado que o agente gera arquivo "./output.png" no workspace
    Quando o sistema processa a resposta
    Entao a imagem e enviada como anexo
    E path fora do workspace e rejeitado

  Cenario: Event deduplication
    Dado que Lark/DingTalk envia evento duplicado
    Quando o sistema processa
    Entao apenas 1 evento e processado (cache TTL 5min)

  Cenario: Plataformas suportadas
    Dado que as plataformas Telegram, WhatsApp, Teams, Lark, DingTalk sao configuradas
    Entao todas aceitam pairing code flow
    E streaming de mensagem e suportado em todas

  Cenario: Pairing expira em 10 minutos
    Dado que um codigo de pairing foi gerado
    Quando 10 minutos passam sem confirmacao
    Entao o codigo expira e novo deve ser gerado