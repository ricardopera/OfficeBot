# spec-id: PARITY-06
# rastreabilidade: extensions/requirements.md EX-01 a EX-12

@paridade
Funcionalidade: Extension Lifecycle

  Cenario: Instalar e ativar extensao
    Dado que uma extensao com manifest valido existe
    Quando install() e chamado
    Entao a extensao e validada contra Zod schema
    E ativada com hooks onInstall + onActivate

  Cenario: Nome invalido rejeitado
    Dado que uma extensao tem nome "aion-my-ext"
    Quando o loader valida o manifest
    Entao a extensao e rejeitada (prefixo reservado)

  Cenario: Permissoes declarativas
    Dado que uma extensao solicita permissao "filesystem: full"
    Quando o sandbox avalia
    Entao o acesso e confinado ao scope declarado

  Cenario: Uninstall remove extensibilidade
    Dado que uma extensao esta ativa
    Quando uninstall() e chamado
    Entao onDeactivate e executado
    E a extensao nao aparece mais em detectedAgents

  Cenario: Sandbox isola APIs
    Dado que uma extensao tenta acessar API nao declarada
    Quando a sandbox intercepta
    Entao um erro e lancado e acesso e negado