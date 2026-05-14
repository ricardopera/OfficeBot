import { describe, it, expect } from 'vitest';
import { sanitizePath } from '../../src/main/services/FileSystem';

describe('FileSystem.sanitizePath', () => {
  it('allows paths within workspace', () => {
    const result = sanitizePath('/workspace', 'file.txt');
    expect(result).toBe('/workspace/file.txt');
  });

  it('allows nested paths within workspace', () => {
    const result = sanitizePath('/workspace', 'subdir/file.txt');
    expect(result).toBe('/workspace/subdir/file.txt');
  });

  it('throws for path traversal', () => {
    expect(() => sanitizePath('/workspace', '../etc/passwd')).toThrow('fora do workspace');
  });

  it('throws for absolute path outside workspace', () => {
    expect(() => sanitizePath('/workspace', '/etc/passwd')).toThrow('fora do workspace');
  });

  it('allows root workspace path itself', () => {
    const result = sanitizePath('/workspace', '.');
    expect(result).toBe('/workspace');
  });
});
