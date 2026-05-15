import { z } from 'zod';

const RESERVED_PREFIXES = ['aion-', 'internal-', 'builtin-', 'system-'] as const;
const KEBAB_CASE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

export const PermissionScopeSchema = z.union([
  z.literal('extension-only'),
  z.literal('workspace'),
  z.literal('full'),
]);

export const NetworkConfigSchema = z.union([
  z.boolean(),
  z.object({
    allowedDomains: z.array(z.string()),
    reasoning: z.string().optional(),
  }),
]);

export const PermissionsSchema = z.object({
  storage: z.boolean().optional().default(false),
  network: NetworkConfigSchema.optional(),
  shell: z.boolean().optional().default(false),
  filesystem: PermissionScopeSchema.optional().default('extension-only'),
  clipboard: z.boolean().optional().default(false),
  activeUser: z.boolean().optional().default(false),
  events: z.boolean().optional().default(false),
});

export const LifecycleHookSchema = z.union([
  z.string(),
  z.object({
    script: z.string(),
    shell: z.boolean().optional(),
    timeout: z.number().optional(),
  }),
]).optional();

export const LifecycleSchema = z.object({
  onInstall: LifecycleHookSchema,
  onActivate: LifecycleHookSchema,
  onDeactivate: LifecycleHookSchema,
  onUninstall: LifecycleHookSchema,
});

export type LifecycleHook = string | { script: string; shell?: boolean; timeout?: number };

export const ExtensionManifestSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(64, 'Name must be at most 64 characters')
    .refine(
      (name) => KEBAB_CASE_REGEX.test(name),
      'Name must be kebab-case (lowercase letters, numbers, hyphens)'
    )
    .refine(
      (name) => !RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix)),
      `Name cannot use reserved prefixes: ${RESERVED_PREFIXES.join(', ')}`
    ),
  version: z.string()
    .regex(SEMVER_REGEX, 'Version must be valid semver (e.g., 1.0.0 or 1.0.0-beta.1)'),
  description: z.string().optional(),
  permissions: PermissionsSchema.optional().default({}),
  lifecycle: LifecycleSchema.optional(),
  contributes: z.record(z.unknown()).optional(),
  engine: z.object({
    aionui: z.string().optional(),
    apiVersion: z.string().optional(),
  }).optional(),
  dependencies: z.array(z.string()).optional(),
});

export type ExtensionManifest = z.infer<typeof ExtensionManifestSchema>;

export interface LoadedExtension {
  manifest: ExtensionManifest;
  directory: string;
  loadedAt: number;
}

export interface ExtensionState {
  name: string;
  version: string;
  enabled: boolean;
  installedAt: number;
  lastActivatedAt: number | null;
}

export type ExtensionStatus = 'not_installed' | 'detected' | 'loaded' | 'persistent_error' | 'transient_error';

export interface ExtensionError {
  code: string;
  message: string;
  details?: unknown;
}