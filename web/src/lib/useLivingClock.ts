import { useEffect, useState } from "react";

const TIME_ZONE = "Africa/Addis_Ababa";

export interface LivingClock {
  weekday: string;
  date: string;
  /** Full living time with seconds, 12-hour. */
  time: string;
  /** Phone-friendly time without seconds. */
  timeShort: string;
  /** Compact date + time for mid-width sticky bars. */
  compact: string;
}

function readClock(now: Date): LivingClock {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: TIME_ZONE,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(now);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(now);

  const timeShort = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(now);

  const compactDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(now);

  return {
    weekday,
    date,
    time,
    timeShort,
    compact: `${compactDate} · ${timeShort}`,
  };
}

/** Live East Africa Time clock — ticks once a second for a newspaper feel. */
export function useLivingClock(): LivingClock {
  const [clock, setClock] = useState(() => readClock(new Date()));

  useEffect(() => {
    const tick = () => setClock(readClock(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return clock;
}
