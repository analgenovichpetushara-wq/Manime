/**
 * Minimal, dependency-free subtitle parsing (WebVTT + SubRip).
 * Only used when a provider actually exposes a subtitle sidecar; the player
 * never invents subtitle text.
 */
export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function parseTimestamp(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length < 2) return Number.NaN;
  const seconds = Number.parseFloat(parts[parts.length - 1] ?? '0');
  const minutes = Number.parseInt(parts[parts.length - 2] ?? '0', 10);
  const hours = parts.length > 2 ? Number.parseInt(parts[0] ?? '0', 10) : 0;
  if (!Number.isFinite(seconds) || !Number.isFinite(minutes) || !Number.isFinite(hours)) return Number.NaN;
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseSubtitles(raw: string): SubtitleCue[] {
  if (!raw || typeof raw !== 'string') return [];
  const blocks = raw.replace(/\r/g, '').split(/\n{2,}/);
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (!lines.length) continue;
    const timeLineIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeLineIndex === -1) continue;
    const [startRaw, endRaw] = lines[timeLineIndex]!.split('-->').map((part) => part.trim().split(' ')[0] ?? '');
    const start = parseTimestamp(startRaw ?? '');
    const end = parseTimestamp(endRaw ?? '');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const text = lines
      .slice(timeLineIndex + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (!text) continue;
    cues.push({ start, end, text });
  }
  return cues.sort((a, b) => a.start - b.start);
}

export function activeCue(cues: SubtitleCue[], positionSec: number): SubtitleCue | null {
  if (!cues.length) return null;
  let low = 0;
  let high = cues.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const cue = cues[mid]!;
    if (positionSec < cue.start) high = mid - 1;
    else if (positionSec > cue.end) low = mid + 1;
    else return cue;
  }
  return null;
}
