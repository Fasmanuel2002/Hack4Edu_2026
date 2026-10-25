const CLOCK = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/** "14:05" style time for message timestamps, in the reader's locale. */
export function clockTime(ms: number): string {
  return CLOCK.format(ms);
}

export function isoTime(ms: number): string {
  return new Date(ms).toISOString();
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
