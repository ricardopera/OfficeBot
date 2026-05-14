// Typed IPC channel names for main ↔ renderer communication

export const IPC = {
  // ─── Agent ────────────────────────────────────────────────────────────
  AGENT_SEND_MESSAGE: 'agent:send-message',
  AGENT_STOP: 'agent:stop',
  AGENT_STREAM_EVENT: 'agent:stream-event', // main → renderer

  // ─── Approval ─────────────────────────────────────────────────────────
  APPROVAL_REQUEST: 'approval:request',     // main → renderer
  APPROVAL_RESPOND: 'approval:respond',     // renderer → main

  // ─── Conversations ─────────────────────────────────────────────────────
  CONV_LIST: 'conv:list',
  CONV_CREATE: 'conv:create',
  CONV_GET: 'conv:get',
  CONV_UPDATE: 'conv:update',
  CONV_DELETE: 'conv:delete',
  CONV_MESSAGES: 'conv:messages',
  CONV_IMPORT: 'conv:import',

  // ─── Providers ─────────────────────────────────────────────────────────
  PROVIDER_LIST: 'provider:list',
  PROVIDER_CREATE: 'provider:create',
  PROVIDER_UPDATE: 'provider:update',
  PROVIDER_DELETE: 'provider:delete',
  PROVIDER_FETCH_MODELS: 'provider:fetch-models',
  PROVIDER_FETCH_MODELS_DRAFT: 'provider:fetch-models-draft',

  // ─── Settings ──────────────────────────────────────────────────────────
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // ─── File System ───────────────────────────────────────────────────────
  FS_LIST: 'fs:list',
  FS_READ: 'fs:read',
  FS_WRITE: 'fs:write',
  FS_DELETE: 'fs:delete',
  FS_RENAME: 'fs:rename',
  FS_MKDIR: 'fs:mkdir',

  // ─── Workspace ─────────────────────────────────────────────────────────
  WORKSPACE_OPEN: 'workspace:open',
  WORKSPACE_GET: 'workspace:get',

  // ─── Terminal ──────────────────────────────────────────────────────────
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',   // main → renderer
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_LIST: 'terminal:list',

  // ─── Dialog ─────────────────────────────────────────────────────────────
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FILE: 'dialog:save-file',
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',

  // ─── Shell ──────────────────────────────────────────────────────────────
  SHELL_OPEN_EXTERNAL: 'shell:open-external',

  // ─── App ─────────────────────────────────────────────────────────────────
  APP_VERSION: 'app:version',
  APP_QUIT: 'app:quit',
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];
