import { createContext, useContext, useState, ReactNode } from "react";

interface MaintenanceContextType {
  isMaintenance: boolean;
  toggleMaintenance: () => void;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(() => {
    try {
      return localStorage.getItem("maintenanceMode") === "true";
    } catch {
      return false;
    }
  });

  const toggleMaintenance = () => {
    setIsMaintenance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("maintenanceMode", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <MaintenanceContext.Provider value={{ isMaintenance, toggleMaintenance }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (!context) throw new Error("useMaintenance must be used within MaintenanceProvider");
  return context;
}
