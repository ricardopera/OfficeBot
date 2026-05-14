import type { ApprovalMode, ApprovalPolicy, ApprovalRequest, ApprovalResponse } from '@shared/types';
import {
  SEMI_AUTO_REQUIRES_APPROVAL,
  YOLO_REQUIRES_APPROVAL,
  TOOL_NAMES,
} from '@shared/constants';

type ResolveFn = (response: ApprovalResponse) => void;

export class ApprovalEngine {
  private mode: ApprovalMode = 'semi-auto';
  private policies: ApprovalPolicy[] = [];
  private pendingApprovals = new Map<string, ResolveFn>();
  private approveAll = false;

  constructor(
    private sendApprovalRequest: (req: ApprovalRequest) => void
  ) {}

  setMode(mode: ApprovalMode, policies: ApprovalPolicy[] = []): void {
    this.mode = mode;
    this.policies = policies;
    this.approveAll = false;
  }

  resetApproveAll(): void {
    this.approveAll = false;
  }

  /**
   * Check whether a tool call requires approval and, if so, wait for it.
   * Returns true if the call should proceed, false if rejected.
   */
  async requestApproval(
    toolName: string,
    args: Record<string, unknown>,
    diff?: string
  ): Promise<boolean> {
    if (this.approveAll) return true;

    const needsApproval = this.requiresApproval(toolName, args);
    if (!needsApproval) return true;

    const requestId = `approval_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const request: ApprovalRequest = {
      requestId,
      toolName,
      args,
      diff,
      timestamp: Date.now(),
    };

    return new Promise<boolean>((resolve) => {
      this.pendingApprovals.set(requestId, (response) => {
        if (response.approveAll) {
          this.approveAll = true;
        }
        resolve(response.approved);
      });
      this.sendApprovalRequest(request);
    });
  }

  respond(response: ApprovalResponse): void {
    const resolveFn = this.pendingApprovals.get(response.requestId);
    if (resolveFn) {
      this.pendingApprovals.delete(response.requestId);
      resolveFn(response);
    }
  }

  private requiresApproval(toolName: string, _args: Record<string, unknown>): boolean {
    switch (this.mode) {
      case 'safe':
        return true;

      case 'yolo':
        return YOLO_REQUIRES_APPROVAL.includes(toolName as (typeof YOLO_REQUIRES_APPROVAL)[number]);

      case 'semi-auto':
        return SEMI_AUTO_REQUIRES_APPROVAL.includes(
          toolName as (typeof SEMI_AUTO_REQUIRES_APPROVAL)[number]
        );

      case 'custom': {
        const policy = this.policies.find((p) => p.toolName === toolName);
        if (policy) return !policy.autoApprove;
        // Default to requiring approval for write operations in custom mode
        return SEMI_AUTO_REQUIRES_APPROVAL.includes(
          toolName as (typeof SEMI_AUTO_REQUIRES_APPROVAL)[number]
        );
      }

      default:
        return false;
    }
  }
}
