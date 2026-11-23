export const imageExtensions: Record<string, string> = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif' };
export function validImageBytes(type: string, bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/png') return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (type === 'image/avif') return String.fromCharCode(...bytes.slice(4,12)) === 'ftypavif';
  return false;
}
