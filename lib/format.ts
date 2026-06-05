export function formatTime(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseTimeToSeconds(value: string): number | null {
  const match = value.match(/^(\d+):([0-5]\d)$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}
