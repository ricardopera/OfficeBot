// Shared constants and default values

export const APP_NAME = 'OfficeBot';
export const APP_VERSION = '1.0.0';

export const DEFAULT_MAX_STEPS = 20;
export const DEFAULT_MAX_TOKENS = 4096;
export const DEFAULT_TEMPERATURE = 0.7;

export const CONTEXT_COMPRESSION_THRESHOLD = 0.8; // 80% of context window

/** Fallback context window size (tokens) used when model info is unavailable. */
export const DEFAULT_CONTEXT_WINDOW_TOKENS = 128_000;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TERMINAL_HISTORY = 1000;

export const TOOL_NAMES = {
  READ_FILE: 'readFile',
  WRITE_FILE: 'writeFile',
  EDIT_FILE: 'editFile',
  LIST_DIRECTORY: 'listDirectory',
  GLOB: 'glob',
  GREP: 'grep',
  BASH: 'bash',
  READ_EXCEL: 'readExcel',
  WRITE_EXCEL: 'writeExcel',
  READ_DOCUMENT: 'readDocument',
  CREATE_REPORT: 'createReport',
  READ_PDF: 'readPDF',
  WEB_SEARCH: 'webSearch',
  GENERATE_CHART: 'generateChart',
} as const;

// Tools that require approval in semi-auto mode
export const SEMI_AUTO_REQUIRES_APPROVAL = [
  TOOL_NAMES.WRITE_FILE,
  TOOL_NAMES.EDIT_FILE,
  TOOL_NAMES.BASH,
  TOOL_NAMES.WRITE_EXCEL,
  TOOL_NAMES.CREATE_REPORT,
  TOOL_NAMES.GENERATE_CHART,
];

// Tools that require approval in safe mode (all tools)
export const SAFE_MODE_ALL_APPROVE = true;

// Auto-approved in YOLO mode (bash still needs approval)
export const YOLO_REQUIRES_APPROVAL = [TOOL_NAMES.BASH];

export const SUPPORTED_FILE_TYPES = [
  '.txt', '.csv', '.xlsx', '.xls', '.docx', '.pdf',
  '.png', '.jpg', '.jpeg', '.json', '.xml', '.md',
  '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs',
  '.html', '.css', '.yaml', '.yml', '.toml', '.env'
];

export const TEXT_FILE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.csv',
  '.py', '.java', '.cs', '.html', '.css', '.yaml', '.yml', '.toml',
  '.sh', '.bash', '.xml', '.sql', '.rs', '.go', '.rb', '.php',
  '.c', '.cpp', '.h', '.hpp', '.swift', '.kt', '.r', '.env',
];

export const DANGEROUS_BASH_PATTERNS = [
  /rm\s+-rf\s+\//,
  /sudo\s/,
  />\s*\/dev\//,
  /mkfs/,
  /dd\s+if=/,
  /chmod\s+777\s+\//,
  /chown\s+.*\s+\//,
  /:(){ :|:& };:/, // fork bomb
  /wget.*\|\s*sh/,
  /curl.*\|\s*sh/,
  /eval\s+/,
  /base64\s+-d/,
];
