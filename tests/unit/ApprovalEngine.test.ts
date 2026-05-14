import { describe, it, expect, vi } from 'vitest';
import { ApprovalEngine } from '../../src/main/agent/ApprovalEngine';

describe('ApprovalEngine', () => {
  const mockSend = vi.fn();

  it('auto-approves readFile in semi-auto mode', async () => {
    const engine = new ApprovalEngine(mockSend);
    engine.setMode('semi-auto');
    const result = await engine.requestApproval('readFile', { filePath: 'test.txt' });
    expect(result).toBe(true);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('requires approval for writeFile in semi-auto mode', () => {
    const engine = new ApprovalEngine(mockSend);
    engine.setMode('semi-auto');
    // Should call sendApprovalRequest (we mock a promise resolution below)
    let resolver: (r: { requestId: string; approved: boolean }) => void = () => {};
    mockSend.mockImplementationOnce((req: { requestId: string }) => {
      resolver = (resp) => engine.respond(resp);
      setTimeout(() => resolver({ requestId: req.requestId, approved: true }), 0);
    });

    const promise = engine.requestApproval('writeFile', { filePath: 'out.txt' });
    return expect(promise).resolves.toBe(true);
  });

  it('auto-approves everything in yolo mode except bash', async () => {
    const engine = new ApprovalEngine(mockSend);
    engine.setMode('yolo');
    expect(await engine.requestApproval('writeFile', {})).toBe(true);
    expect(await engine.requestApproval('editFile', {})).toBe(true);
  });

  it('requires approval for bash in yolo mode', () => {
    const engine = new ApprovalEngine(mockSend);
    engine.setMode('yolo');
    mockSend.mockImplementationOnce((req: { requestId: string }) => {
      setTimeout(() => engine.respond({ requestId: req.requestId, approved: false }), 0);
    });
    return expect(engine.requestApproval('bash', { command: 'ls' })).resolves.toBe(false);
  });
});
