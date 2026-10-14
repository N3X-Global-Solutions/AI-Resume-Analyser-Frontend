/** Display helpers. Keep all number / date formatting in one place. */

const EMPTY = '—'

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Floors to `decimals` places; the epsilon absorbs float error (e.g. 84.8 * 10 = 847.999…). */
function floorTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.floor(value * factor + 1e-9) / factor
}

/**
 * Number part of a match score: 84.8 → "84" (or "84.8" with 1 decimal), 100 → "100".
 * Floors instead of rounding so the shown number never crosses a tier threshold (84.8 is Good, not "85").
 */
export function formatScoreValue(score: number, decimals = 0): string {
  const floored = floorTo(score, decimals)
  return decimals > 0 ? floored.toFixed(decimals).replace(/\.0+$/, '') : String(floored)
}

/** 94.0 → "94%", 84.8 → "84%" (floored, see formatScoreValue); with decimals = 1 → "84.8%". */
export function formatScore(score: number | null | undefined, decimals = 0): string {
  if (score === null || score === undefined || Number.isNaN(score)) return EMPTY
  return `${formatScoreValue(score, decimals)}%`
}

/** 33.66 → "33.7" (category points, effective weights). */
export function formatPoints(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY
  return roundTo(value, 1).toFixed(1).replace(/\.0$/, '')
}

/** Any 0..100 percentage → "42%" (or "42.5%" with decimals). */
export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY
  const rounded = roundTo(value, decimals)
  return `${decimals > 0 ? rounded.toFixed(decimals).replace(/\.0+$/, '') : Math.round(rounded)}%`
}

/** 4.24 → "4.2 yrs", 1 → "1 yr", null → "—". */
export function formatYears(years: number | null | undefined, opts: { short?: boolean } = {}): string {
  if (years === null || years === undefined || Number.isNaN(years)) return EMPTY
  const rounded = roundTo(years, 1)
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  if (opts.short) return `${text}y`
  return `${text} ${rounded === 1 ? 'yr' : 'yrs'}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY
  return value.toLocaleString('en-US')
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return EMPTY
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "Oct 8, 2026" */
export function formatDate(iso: string | null | undefined): string {
  const date = parseDate(iso)
  if (!date) return EMPTY
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Oct 8, 2026, 3:42 PM" */
export function formatDateTime(iso: string | null | undefined): string {
  const date = parseDate(iso)
  if (!date) return EMPTY
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "just now", "5 minutes ago", "yesterday", "3 days ago", then a date. */
export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  const date = parseDate(iso)
  if (!date) return EMPTY
  const seconds = Math.round((date.getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'just now'
  if (abs < 60 * 60) return relativeFormatter.format(Math.round(seconds / 60), 'minute')
  if (abs < 60 * 60 * 24) return relativeFormatter.format(Math.round(seconds / 3600), 'hour')
  if (abs < 60 * 60 * 24 * 7) return relativeFormatter.format(Math.round(seconds / 86400), 'day')
  if (abs < 60 * 60 * 24 * 30) return relativeFormatter.format(Math.round(seconds / (86400 * 7)), 'week')
  return formatDate(iso)
}

/** 340 → "340 ms", 1830 → "1.8 s". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return EMPTY
  if (ms < 1000) return `${Math.round(ms)} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)} s`
  return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`
}

const CURRENCY_LOCALE: Record<string, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' }

function formatMoney(value: number, currency: string | null): string {
  if (!currency) return value.toLocaleString('en-US')
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString('en-US')}`
  }
}

/** "₹12L – ₹18L", "From $120K", "Up to €90K" or null when no salary is set. */
export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  const cur = currency ?? null
  const hasMin = min !== null && min !== undefined
  const hasMax = max !== null && max !== undefined
  if (hasMin && hasMax) return `${formatMoney(min, cur)} – ${formatMoney(max, cur)}`
  if (hasMin) return `From ${formatMoney(min, cur)}`
  if (hasMax) return `Up to ${formatMoney(max, cur)}`
  return null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2021-03" → "Mar 2021", "2021" → "2021", "Present" → "Present". */
export function formatYearMonth(value: string | null | undefined): string | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{1,2})/.exec(value)
  if (match) {
    const month = MONTHS[Number(match[2]) - 1]
    return month ? `${month} ${match[1]}` : match[1]
  }
  return value
}

/** "Mar 2021 – Present" */
export function formatPeriod(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = formatYearMonth(start)
  const e = formatYearMonth(end)
  if (s && e) return `${s} – ${e}`
  return s ?? e ?? null
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** part / total as 0..100 (0 when total is 0). */
export function ratio(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0
}

export function displayName(name: string | null | undefined, fallback = 'Unnamed candidate'): string {
  return name?.trim() ? name.trim() : fallback
}

export function fileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : ''
}

/** Makes a URL clickable: adds https:// when missing. */
export function toHref(link: string): string {
  if (/^https?:\/\//i.test(link)) return link
  if (/^mailto:/i.test(link)) return link
  return `https://${link}`
}

export function prettyLink(link: string): string {
  return link.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}
