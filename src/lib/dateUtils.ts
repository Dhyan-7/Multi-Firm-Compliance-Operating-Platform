/**
 * Safely parses any date string from SQLite or APIs into a valid Date object.
 * 
 * SQLite stores CURRENT_TIMESTAMP as 'YYYY-MM-DD HH:MM:SS' in UTC without a 'Z' suffix.
 * When passed directly to new Date("2026-09-15 22:06:28"), standard JS interprets it
 * as LOCAL browser time instead of UTC, causing a 5.5 hour backward shift in IST (+05:30).
 * 
 * This function ensures all SQLite and ISO strings are parsed strictly as UTC.
 */
export function parseUtcDate(dateInput: string | number | Date | null | undefined): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  const str = String(dateInput).trim();
  if (!str) return new Date();

  // SQLite CURRENT_TIMESTAMP format: "YYYY-MM-DD HH:MM:SS"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    return new Date(str.replace(' ', 'T') + 'Z');
  }

  // ISO string without trailing Z: "YYYY-MM-DDTHH:MM:SS"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    return new Date(str + 'Z');
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formats a date into a standard Indian Standard Time (IST) representation.
 * Example: "16 Sept 2026, 03:36:28 am"
 */
export function formatISTDateTime(dateInput: any, options?: Intl.DateTimeFormatOptions): string {
  const d = parseUtcDate(dateInput);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options,
  };
  return d.toLocaleString('en-IN', defaultOptions);
}

/**
 * Short format for timeline and notifications, e.g. "16 Sep, 03:36 am"
 */
export function formatISTShort(dateInput: any): string {
  const d = parseUtcDate(dateInput);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Date only in IST, e.g. "16 Sep 2026"
 */
export function formatISTDate(dateInput: any): string {
  const d = parseUtcDate(dateInput);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Time only in IST, e.g. "03:36 am"
 */
export function formatISTTime(dateInput: any): string {
  const d = parseUtcDate(dateInput);
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Relative time helper: "Just now", "5m ago", "2h ago", "Yesterday"
 */
export function formatRelativeTime(dateInput: any): string {
  const d = parseUtcDate(dateInput);
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatISTDate(dateInput);
}
