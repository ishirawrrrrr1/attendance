const MANILA_TIMEZONE = "Asia/Manila";

function partsFor(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return formatter
    .formatToParts(date)
    .filter((part) => part.type !== "literal")
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
}

export function getNowInManila() {
  const now = new Date();
  const parts = partsFor(now);

  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}:${parts.second}`;

  return {
    date,
    time,
    iso: `${date}T${time}+08:00`,
    jsDate: new Date(`${date}T${time}+08:00`)
  };
}

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: MANILA_TIMEZONE
  }).format(new Date(`${date}T00:00:00+08:00`));
}

export function formatTimeLabel(time?: string | null) {
  if (!time) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: MANILA_TIMEZONE
  }).format(new Date(`1970-01-01T${time}+08:00`));
}

export function currentDateString() {
  return getNowInManila().date;
}

export function businessDaysBetween(startDate: string, endDate: string) {
  let start = new Date(`${startDate}T00:00:00+08:00`);
  let end = new Date(`${endDate}T00:00:00+08:00`);

  if (start > end) {
    [start, end] = [end, start];
  }

  let count = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}

export function normalizeDateRange(startDate: string, endDate: string) {
  if (startDate <= endDate) {
    return [startDate, endDate] as const;
  }

  return [endDate, startDate] as const;
}
