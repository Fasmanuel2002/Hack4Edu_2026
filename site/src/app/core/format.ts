const CLOCK = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/** "14:05" style time for message timestamps, in the reader's locale. */
export function clockTime(ms: number): string {
  return CLOCK.format(ms);
}

export function isoTime(ms: number): string {
  return new Date(ms).toISOString();
}

/** "4.2 s" under a minute, "2 min 5 s" above (CPU answers can take minutes). */
export function formatDuration(ms: number): string {
  const tenths = Math.round(ms / 100);
  if (tenths < 600) {
    return `${(tenths / 10).toFixed(1)} s`;
  }
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
