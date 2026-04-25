import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import type { SensorReading } from "../types/sensor-data";
import { supabase } from "../lib/supabaseClient";
import { useThresholds } from "./ThresholdContext";

export interface DosingEvent {
  id: string;
  timestamp: number;
  type: "EC" | "pH";
  action: "started" | "stopped";
  value?: number;
}

interface DosingContextType {
  dosingHistory: DosingEvent[];
  checkDosingEvents: (reading: SensorReading) => void;
  clearDosingHistory: () => void;
}

const DosingContext = createContext<DosingContextType | undefined>(undefined);

export function DosingProvider({ children }: { children: ReactNode }) {
  const [dosingHistory, setDosingHistory] = useState<DosingEvent[]>([]);
  const { thresholds } = useThresholds();

  // Track last flag states in refs (stable across renders, no re-render loops)
  const lastECFlagRef = useRef<number | undefined>(undefined);
  const lastPHFlagRef = useRef<number | undefined>(undefined);
  // Prevent duplicate processing when the same reading triggers the effect multiple times
  const lastProcessedTimestampRef = useRef<number | undefined>(undefined);

  // Load dosing history from Supabase, then backfill any transitions
  // missed while the site was closed by scanning the measurements table.
  useEffect(() => {
    (async () => {
      // 1. Load existing dosing_history rows
      const { data: histData, error: histError } = await supabase
        .from("dosing_history")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(10000);

      if (histError) {
        console.error("Failed to load dosing history:", histError);
      }

      const existingEvents: DosingEvent[] = (histData || []).map((row: any) => ({
        id: `${row.event_type.toLowerCase()}-${row.id}`,
        timestamp: new Date(row.occurred_at).getTime(),
        type: row.event_type as DosingEvent["type"],
        action: row.action as DosingEvent["action"],
        value: row.sensor_value ?? undefined,
      }));

      // 2. Scan measurements for flag transitions (catches events missed while site was closed)
      const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      const PAGE_SIZE = 1000;
      const allMeasurements: any[] = [];
      let from = 0;
      while (true) {
        const { data: page, error: pageError } = await supabase
          .from("measurements")
          .select("recorded_at, ec, ph, ec_dosing_flag, ph_dosing_flag")
          .gte("recorded_at", cutoff)
          .order("recorded_at", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (pageError) { console.error("Failed to scan measurements:", pageError); break; }
        if (!page || page.length === 0) break;
        allMeasurements.push(...page);
        from += page.length;
        if (page.length < PAGE_SIZE) break;
      }

      // Build a set of existing event keys (type+action+minute-bucket) to avoid duplicates
      const existingKeys = new Set(
        existingEvents.map((e) => `${e.type}-${e.action}-${Math.floor(e.timestamp / 60000)}`)
      );

      const derivedEvents: DosingEvent[] = [];
      const upsertRows: any[] = [];

      for (let i = 1; i < allMeasurements.length; i++) {
        const prev = allMeasurements[i - 1];
        const curr = allMeasurements[i];
        const ts = new Date(curr.recorded_at).getTime();
        const minuteBucket = Math.floor(ts / 60000);

        const checks: Array<{ type: "EC" | "pH"; prevFlag: number; currFlag: number; value: number }> = [
          { type: "EC", prevFlag: Number(prev.ec_dosing_flag ?? 0), currFlag: Number(curr.ec_dosing_flag ?? 0), value: Number(curr.ec ?? 0) },
          { type: "pH", prevFlag: Number(prev.ph_dosing_flag ?? 0), currFlag: Number(curr.ph_dosing_flag ?? 0), value: Number(curr.ph ?? 0) },
        ];

        for (const { type, prevFlag, currFlag, value } of checks) {
          let action: "started" | "stopped" | null = null;
          if (prevFlag === 0 && currFlag === 1) action = "started";
          else if (prevFlag === 1 && currFlag === 0) action = "stopped";
          if (!action) continue;

          const key = `${type}-${action}-${minuteBucket}`;
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);

          derivedEvents.push({ id: `${type.toLowerCase()}-derived-${ts}`, timestamp: ts, type, action, value });
          upsertRows.push({ event_type: type, action, sensor_value: value, occurred_at: curr.recorded_at });
        }
      }

      // 3. Upsert any newly found events into dosing_history
      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from("dosing_history")
          .upsert(upsertRows, { onConflict: "event_type,action,occurred_at", ignoreDuplicates: true });
        if (upsertError) console.error("Failed to backfill dosing events:", upsertError);
      }

      // 4. Merge and sort all events newest-first
      const merged = [...existingEvents, ...derivedEvents]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10000);

      setDosingHistory(merged);

      // Initialize refs from the most recent events so live detection
      // doesn't re-emit a transition that was already recorded.
      const lastEC = merged.find((e) => e.type === "EC");
      const lastPH = merged.find((e) => e.type === "pH");
      if (lastEC) lastECFlagRef.current = lastEC.action === "started" ? 1 : 0;
      if (lastPH) lastPHFlagRef.current = lastPH.action === "started" ? 1 : 0;
    })();
  }, []);

  const checkDosingEvents = useCallback((reading: SensorReading) => {
    const now = reading.timestamp;
    const newEvents: DosingEvent[] = [];

    // Prevent double-processing the same reading
    // (can happen when dosingHistory state change recreates this callback
    // and triggers the Dashboard useEffect again with the same latestReading)
    if (lastProcessedTimestampRef.current !== undefined && now <= lastProcessedTimestampRef.current) return;
    lastProcessedTimestampRef.current = now;

    if (reading.ecDosingFlag !== undefined) {
      // Detect transition from 0 to 1 (dosing started)
      if (reading.ecDosingFlag === 1 && lastECFlagRef.current === 0) {
        newEvents.push({
          id: `ec-${now}`,
          timestamp: now,
          type: "EC",
          action: "started",
          value: reading.ec,
        });
      }
      // Detect transition from 1 to 0 (dosing stopped)
      if (reading.ecDosingFlag === 0 && lastECFlagRef.current === 1) {
        newEvents.push({
          id: `ec-${now}`,
          timestamp: now,
          type: "EC",
          action: "stopped",
          value: reading.ec,
        });
      }
      lastECFlagRef.current = reading.ecDosingFlag;
    }

    // Check pH dosing flag (0 = not dosing, 1 = dosing)
    // Only log pH dosing when pH is below lower threshold (too low)
    if (reading.phDosingFlag !== undefined) {
      const phTooLow = reading.ph < thresholds.ph.lower;

      // Detect transition from 0 to 1 (dosing started) — only when pH is too low
      if (reading.phDosingFlag === 1 && lastPHFlagRef.current === 0 && phTooLow) {
        newEvents.push({
          id: `ph-${now}`,
          timestamp: now,
          type: "pH",
          action: "started",
          value: reading.ph,
        });
      }
      // Detect transition from 1 to 0 (dosing stopped)
      if (reading.phDosingFlag === 0 && lastPHFlagRef.current === 1) {
        newEvents.push({
          id: `ph-${now}`,
          timestamp: now,
          type: "pH",
          action: "stopped",
          value: reading.ph,
        });
      }
      lastPHFlagRef.current = reading.phDosingFlag;
    }

    if (newEvents.length > 0) {
      setDosingHistory((prev) => [...newEvents, ...prev].slice(0, 10000)); // Keep last 10,000 events

      // Persist new dosing events to Supabase
      newEvents.forEach((event) => {
        supabase
          .from("dosing_history")
          .upsert(
            [
              {
                event_type: event.type,
                action: event.action,
                sensor_value: event.value ?? null,
                occurred_at: new Date(event.timestamp).toISOString(),
              },
            ],
            { onConflict: "event_type,action,occurred_at", ignoreDuplicates: true }
          )
          .then(({ error }) => {
            if (error) console.error("Failed to save dosing event:", error);
          });
      });
    }
  }, [thresholds]);

  const clearDosingHistory = useCallback(() => {
    setDosingHistory([]);
    supabase
      .from("dosing_history")
      .delete()
      .neq("id", 0)
      .then(({ error }) => {
        if (error) console.error("Failed to clear dosing history:", error);
      });
  }, []);

  return (
    <DosingContext.Provider value={{ dosingHistory, checkDosingEvents, clearDosingHistory }}>
      {children}
    </DosingContext.Provider>
  );
}

export function useDosing() {
  const context = useContext(DosingContext);
  if (!context) {
    throw new Error("useDosing must be used within DosingProvider");
  }
  return context;
}