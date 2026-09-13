import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

const RESYNC_INTERVAL_MS = 30_000;

/**
 * Tracks (server time - local time) so countdowns aren't at the mercy of a
 * skewed browser clock. The backend remains the real authority on deadlines;
 * this only makes the displayed countdown accurate.
 */
export function useServerTimeOffset() {
  const [offsetMs, setOffsetMs] = useState(0);
  const [synced, setSynced] = useState(false);

  const resync = useCallback(async () => {
    const requestStart = Date.now();
    let response: { now: string };
    try {
      response = await api.get<{ now: string }>("/server-time");
    } catch {
      return;
    }
    const requestEnd = Date.now();

    const roundTripMs = requestEnd - requestStart;
    const serverNowMs = new Date(response.now).getTime() + roundTripMs / 2;
    setOffsetMs(serverNowMs - requestEnd);
    setSynced(true);
  }, []);

  useEffect(() => {
    resync();
    const interval = setInterval(resync, RESYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [resync]);

  const getServerNow = useCallback(() => Date.now() + offsetMs, [offsetMs]);

  return { getServerNow, synced, resync };
}
