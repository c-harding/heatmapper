const locales = [navigator.language, ...navigator.languages];

const smallKilometerFormat = new Intl.NumberFormat(locales, {
  style: 'unit',
  unit: 'kilometer',
  maximumSignificantDigits: 3,
});

const bigKilometerFormat = new Intl.NumberFormat(locales, {
  style: 'unit',
  unit: 'kilometer',
  maximumFractionDigits: 0,
});

export function formatKilometers(meters: number) {
  const kilometers = meters / 1000;
  const format = kilometers >= 100 ? bigKilometerFormat : smallKilometerFormat;
  return format.format(kilometers);
}

const meterFormat = new Intl.NumberFormat(locales, {
  style: 'unit',
  unit: 'meter',
  maximumFractionDigits: 0,
});

export function formatMeters(meters: number) {
  return meterFormat.format(meters);
}

const integerFormat = new Intl.NumberFormat(locales, {
  maximumFractionDigits: 0,
});

export function formatInt(n: number) {
  return integerFormat.format(n);
}

export function formatDuration(duration: number) {
  // If any value is zero,
  // return undefined if the previous value was undefined,
  // otherwise return zero (with the suffix).
  const durationParts = {
    day: Math.floor(duration / 60 / 60 / 24),
    hour: Math.floor((duration / 60 / 60) % 24),
    minute: Math.floor((duration / 60) % 60),
    second: Math.floor(duration % 60),
  };

  const durationPartPairs = Array.from(Object.entries(durationParts));
  const firstValueIndex = durationPartPairs.findIndex(([, value]) => value);

  return (
    durationPartPairs
      .slice(firstValueIndex, firstValueIndex + 2)
      .map(([unit, value]) =>
        value.toLocaleString(locales, { style: 'unit', unitDisplay: 'narrow', unit }),
      )
      // join with non-breaking spaces
      .join('\xa0')
  );
}

const fullDateTimeFormat = new Intl.DateTimeFormat(locales, {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});
const yearFormat = new Intl.DateTimeFormat(locales, { timeZone: 'UTC', year: 'numeric' });
const dayMonthFormat = new Intl.DateTimeFormat(locales, {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});
const monthFormat = new Intl.DateTimeFormat(locales, {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
});
const dateFormat = new Intl.DateTimeFormat(locales, {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatDate(date: number | Date) {
  return dateFormat.format(date);
}

export function formatDateRange(date: number | Date, end: number | Date) {
  return dateFormat.formatRange(date, end);
}

const parts = dateFormat.formatToParts(0);
const yearFirst =
  parts.findIndex((part) => part.type === 'year') <
  parts.findIndex((part) => part.type === 'month');

export function formatSplitDate(date: number | Date) {
  const yearString = yearFormat.format(date);
  const dayString = dayMonthFormat.format(date);
  return yearFirst ? [yearString, dayString] : [dayString, yearString];
}

export function formatFullDateTime(date: number | Date) {
  return fullDateTimeFormat.format(date);
}

export function formatMonth(date: number) {
  return monthFormat.format(date);
}

export function formatYear(date: number) {
  return yearFormat.format(date);
}
