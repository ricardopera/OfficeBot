import type { Migration, MigrationContext } from './index'

export const v27: Migration = {
  version: 27,
  description: 'Add agent_id column to acp_session',
  up: async (ctx: MigrationContext): Promise<void> => {
    const currentVersion = ctx.getVersion()
    if (currentVersion >= 27) {
      return
    }

    ctx.db.transaction(() => {
      ctx.db.exec('BEGIN TRANSACTION')
    })

    try {
      ctx.db.exec(`ALTER TABLE acp_session ADD COLUMN agent_id TEXT NOT NULL DEFAULT ''`)

      const existingRows = ctx.db.query<{ agent_backend: string; conversation_id: string }>(
        `SELECT agent_backend, conversation_id FROM acp_session`,
        []
      )

      for (const row of existingRows) {
        const compositeId = `${row.agent_backend}:${row.conversation_id}`
        ctx.db.run(
          `UPDATE acp_session SET agent_id = ? WHERE agent_backend = ? AND conversation_id = ?`,
          [compositeId, row.agent_backend, row.conversation_id]
        )
      }

      ctx.setVersion(27)
      ctx.db.exec('COMMIT')
    } catch (error) {
      ctx.db.transaction(() => {
        ctx.db.exec('ROLLBACK')
      })
      throw error
    }
  }
}