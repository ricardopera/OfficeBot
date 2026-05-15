import { PermissionsSchema } from '../ExtensionManifest.js';

type PermissionDecision = 'allow_once' | 'allow_always' | 'deny';

interface PermissionResult {
  decision: PermissionDecision;
  cacheable: boolean;
  scope?: string;
}

type RiskLevel = 'safe' | 'moderate' | 'dangerous';

const RISK_CLASSIFICATION: Record<string, RiskLevel> = {
  storage: 'safe',
  events: 'safe',
  clipboard: 'moderate',
  filesystem_workspace: 'moderate',
  network_restricted: 'moderate',
  shell: 'dangerous',
  filesystem_full: 'dangerous',
  network_unrestricted: 'dangerous',
};

export function analyzePermissionRisk(permissions: {
  storage?: boolean;
  network?: boolean | { allowedDomains: string[] };
  shell?: boolean;
  filesystem?: 'extension-only' | 'workspace' | 'full';
}): RiskLevel {
  if (permissions.shell) return 'dangerous';
  if (permissions.filesystem === 'full') return 'dangerous';
  if (typeof permissions.network === 'object' && permissions.network !== true) return 'moderate';
  if (permissions.network === true) return 'dangerous';
  if (permissions.filesystem === 'workspace') return 'moderate';
  if (permissions.clipboard) return 'moderate';

  return 'safe';
}

export function evaluatePermission(
  method: string,
  permissions: {
    storage?: boolean;
    network?: boolean;
    shell?: boolean;
    filesystem?: 'extension-only' | 'workspace' | 'full';
  }
): PermissionResult {
  if (method.startsWith('storage.')) {
    if (!permissions.storage) {
      return { decision: 'deny', cacheable: false };
    }
    return { decision: 'allow_always', cacheable: true, scope: 'extension-only' };
  }

  if (method.startsWith('network.')) {
    if (permissions.network === false) {
      return { decision: 'deny', cacheable: false };
    }
    if (permissions.network === true) {
      return { decision: 'allow_always', cacheable: true };
    }
    return { decision: 'deny', cacheable: false };
  }

  if (method.startsWith('shell.')) {
    if (!permissions.shell) {
      return { decision: 'deny', cacheable: false };
    }
    return { decision: 'allow_always', cacheable: true };
  }

  return { decision: 'deny', cacheable: false };
}

export function getRiskLevel(risk: RiskLevel): 'low' | 'medium' | 'high' {
  switch (risk) {
    case 'safe': return 'low';
    case 'moderate': return 'medium';
    case 'dangerous': return 'high';
  }
}