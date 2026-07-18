import { useEffect, useState } from "react";

/**
 * hevy2garmin universal data. The sync state lives in the soma DB
 * (workout_enrichment, populated by the TS hevy-sync cron), exposed at
 * /api/hevy/status. Override the host with EXPO_PUBLIC_API_URL for device/prod.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3456";

export interface HevyWorkout {
  title: string;
  date: string;
  kcal: number;
  exercises: number;
  sets: number;
  synced: boolean;
  status: string;
}

export interface HevyStatus {
  hevyConnected: boolean;
  garminConnected: boolean;
  totalSynced: number;
  syncedThisWeek: number;
  recent: HevyWorkout[];
}

export function useHevyStatus() {
  const [data, setData] = useState<HevyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/hevy/status`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: HevyStatus) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => { alive = false; };
  }, []);
  return { data, error };
}
