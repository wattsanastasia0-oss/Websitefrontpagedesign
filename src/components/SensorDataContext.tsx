import { createContext, useContext, ReactNode } from "react";
import { useSensorData } from "../hooks/useSensorData";
import { useMaintenance } from "./MaintenanceContext";
import { useProject } from "./ProjectContext";
import type { SensorReading } from "../types/sensor-data";

interface SensorDataContextType {
  readings: SensorReading[];
  latestReading: SensorReading | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

const SensorDataContext = createContext<SensorDataContextType | undefined>(undefined);

export function SensorDataProvider({ children }: { children: ReactNode }) {
  const { isMaintenance } = useMaintenance();
  const { viewingProject, liveProject: _liveProject, isReadOnly } = useProject();

  // When viewing an old project, scope data to its date range
  const dateRange = isReadOnly && viewingProject
    ? { from: new Date(viewingProject.started_at), to: viewingProject.ended_at ? new Date(viewingProject.ended_at) : new Date() }
    : undefined;

  const data = useSensorData(isMaintenance || isReadOnly, dateRange);
  return (
    <SensorDataContext.Provider value={data}>
      {children}
    </SensorDataContext.Provider>
  );
}

export function useSharedSensorData(): SensorDataContextType {
  const context = useContext(SensorDataContext);
  if (!context) {
    throw new Error("useSharedSensorData must be used within SensorDataProvider");
  }
  return context;
}
