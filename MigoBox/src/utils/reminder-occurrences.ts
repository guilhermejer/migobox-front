import { domain } from '@/types/domain';

const MAX_OCCURRENCES = 366;

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function addYearsUTC(base: Date, years: number): Date {
  const y = base.getUTCFullYear() + years;
  const d = clampDay(y, base.getUTCMonth() + 1, base.getUTCDate());
  return new Date(Date.UTC(y, base.getUTCMonth(), d));
}

function addMonthsUTC(base: Date, months: number): Date {
  const total = base.getUTCMonth() + months;
  const y = base.getUTCFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const d = clampDay(y, m + 1, base.getUTCDate());
  return new Date(Date.UTC(y, m, d));
}

function nextOccurrence(
  rec: domain.ReminderRecurrence,
  base: Date,
  after: Date,
): Date | null {
  if (rec === 'none' || !rec) return null;

  if (after < base) return base;

  switch (rec) {
    case 'yearly': {
      const diff = after.getUTCFullYear() - base.getUTCFullYear();
      let cand = addYearsUTC(base, diff);
      if (!(cand > after)) cand = addYearsUTC(base, diff + 1);
      return cand;
    }
    case 'monthly': {
      const diff =
        (after.getUTCFullYear() - base.getUTCFullYear()) * 12 +
        (after.getUTCMonth() - base.getUTCMonth());
      let cand = addMonthsUTC(base, diff);
      if (!(cand > after)) cand = addMonthsUTC(base, diff + 1);
      return cand;
    }
  }
  return null;
}

export function occurrencesBetween(
  rec: domain.ReminderRecurrence,
  baseDate: string,
  fromDate: string,
  toDate: string,
): string[] {
  const parse = (s: string) => {
    const datePart = s.split('T')[0];
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };

  const base = parse(baseDate);
  const from = parse(fromDate);
  const to = parse(toDate);

  if (to < from) return [];

  if (rec === 'none' || !rec) {
    if (base >= from && base <= to) return [isoDate(base)];
    return [];
  }

  const dayBeforeFrom = new Date(from.getTime() - 86400000);
  let cursor = nextOccurrence(rec, base, dayBeforeFrom);
  if (!cursor) return [];

  const result: string[] = [];
  while (cursor <= to && result.length < MAX_OCCURRENCES) {
    if (cursor >= from) {
      result.push(isoDate(cursor));
    }
    const next = nextOccurrence(rec, base, cursor);
    if (!next) break;
    cursor = next;
  }
  return result;
}

export function expandReminders(
  reminders: domain.Reminder[],
  from: string,
  to: string,
): { date: string; reminder: domain.Reminder }[] {
  const result: { date: string; reminder: domain.Reminder }[] = [];
  for (const rem of reminders) {
    if (!rem.triggerAt) continue;
    const dates = occurrencesBetween(
      rem.recurrence ?? 'none',
      rem.triggerAt,
      from,
      to,
    );
    for (const d of dates) {
      result.push({ date: d, reminder: rem });
    }
  }
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}
