import { randomUUID } from './uuid';

export function createId(prefix = 'id'): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function shortRoomCode(seed?: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const base = seed ?? Math.floor(Math.random() * 1e9);
  let value = base;
  let out = '';
  for (let index = 0; index < 6; index += 1) {
    out += alphabet[value % alphabet.length] ?? 'A';
    value = Math.floor(value / alphabet.length) + 7;
  }
  return out;
}

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}
