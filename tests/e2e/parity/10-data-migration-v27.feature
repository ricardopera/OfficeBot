# spec-id: PARITY-10
# rastreabilidade: data_migration_plan.md T-01 a T-03

@paridade @critico
Funcionalidade: Data Migration v27

  Cenario: Migration v27 executa automaticamente
    Dado que o banco SQLite tem user_version = 26
    Quando o OfficeBot abre o banco
    Entao migration v27 executa em transacao
    E acp_session ganha coluna agent_id
    E user_version e atualizado para 27

  Cenario: Schema integrity pos-migration
    Dado que a migration v27 completou
    Quando PRAGMA integrity_check e executado
    Entao o resultado e "ok"
    E PRAGMA foreign_key_check retorna 0 violations

  Cenario: Dados preservados
    Dado que o banco tinha N conversations e M messages
    Quando a migration v27 completa
    Entao SELECT COUNT(*) retorna N conversations e M messages
    E nenhum dado existente foi perdido

  Cenario: Backfill agent_id NULL
    Dado que a coluna agent_id foi adicionada
    Quando o backfill executa
    Entao registros existentes ganham agent_id=NULL
    E novos registros recebem valor correto

  Cenario: Migration idempotente
    Dado que a migration v27 ja executou (user_version=27)
    Quando o banco e aberto novamente
    Entao a migration não executa novamente
    E user_version permanece 27