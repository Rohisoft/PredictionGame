import { useEffect, useState } from "react";

/** Re-renders every `intervalMs`, returning the current server-synced time. */
export function useServerTick(getServerNow: () => number, intervalMs = 500) {
  const [now, setNow] = useState(() => getServerNow());

  useEffect(() => {
    const interval = setInterval(() => setNow(getServerNow()), intervalMs);
    return () => clearInterval(interval);
  }, [getServerNow, intervalMs]);

  return now;
}
