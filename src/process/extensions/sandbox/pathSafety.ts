export function isPathWithinDirectory(targetPath: string, directory: string): boolean {
  const target = targetPath.replace(/\\/g, '/');
  const dir = directory.replace(/\\/g, '/');
  const normalizedTarget = target.replace(/\/+/g, '/');
  const normalizedDir = `${dir.replace(/\/+$/, '')}/`;

  return normalizedTarget.startsWith(normalizedDir) || normalizedTarget === normalizedDir.slice(0, -1);
}