# spec-id: PARITY-05
# rastreabilidade: team/requirements.md TM-01 a TM-16

@paridade
Funcionalidade: Team Collaboration

  Cenario: Criar time com leader e teammates
    Dado que o usuario especifica N agentes com workspace
    Quando createTeam() e chamado
    Entao o time e criado com pelo menos 1 leader
    E agentes sao spawnados com status "pending"

  Cenario: Leader nao pode ser removido
    Dado que um time tem 1 leader e 1 teammate
    Quando removeAgent(leader) e chamado
    Entao a operacao e rejeitada

  Cenario: Agente inativo marcado como failed
    Dado que um teammate esta ativo sem output por 60s
    Quando o timeout dispara
    Entao o agente e marcado como failed
    E o leader e notificado via testament

  Cenario: Mailbox assincrona
    Dado que agent A envia mensagem para agent B
    Quando write() e chamado
    Entao B pode ler via readUnread() atomica
    E a mensagem e marcada como lida

  Cenario: Leader inicia spawn primeiro
    Dado que um time esta sendo criado
    Quando a inicializacao comeca
    Entao o leader e spawnado antes dos teammates