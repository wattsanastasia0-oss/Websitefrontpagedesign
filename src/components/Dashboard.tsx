import { useState, useEffect, useMemo } from "react";
import { HomePage } from "./HomePage";
import { ECPage } from "./ECPage";
import { PHPage } from "./PHPage";
import { TemperaturePage } from "./TemperaturePage";
import { O2Page } from "./O2Page";
import { WaterLevelPage } from "./WaterLevelPage";
import { WaterFlowPage } from "./WaterFlowPage";
import { TranspirationRatePage } from "./TranspirationRatePage";
import { UserManualPage } from "./UserManualPage";
import { ThresholdPage } from "./ThresholdPage";
import { ExportPage } from "./ExportPage";
import { DosingHistoryPage } from "./DosingHistoryPage";
import { AlertHistoryPage } from "./AlertHistoryPage";
import { CorrelationPage } from "./CorrelationPage";
import { ProjectsPage } from "./ProjectsPage";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Home,
  Zap,
  Droplets,
  Thermometer,
  Wind,
  Waves,
  Leaf,
  BookOpen,
  Settings,
  Download,
  History,
  LogOut,
  Beaker,
  Sun,
  Moon,
  Wrench,
  Activity,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  GitCompare,
  FolderOpen,
  FolderPlus,
  Trash2,
} from "lucide-react";
import { UnitProvider, useUnits } from "./UnitContext";
import { ThresholdProvider, useThresholds } from "./ThresholdContext";
import { AlertProvider, useAlerts } from "./AlertContext";
import { DosingProvider, useDosing } from "./DosingContext";
import { SensorDataProvider, useSharedSensorData } from "./SensorDataContext";
import { MaintenanceProvider, useMaintenance } from "./MaintenanceContext";
import { ProjectProvider, useProject } from "./ProjectContext";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";

/** Isolated clock component — ticks every 1s without re-rendering the rest of Dashboard */
function LiveClock({ lastChanged }: { lastChanged: number | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = new Date(now).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  let updatedText = "No data";
  let isStale = false;
  if (lastChanged) {
    const diff = now - lastChanged;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (seconds < 60) updatedText = `${seconds}s ago`;
    else if (minutes < 60) updatedText = `${minutes}m ago`;
    else if (hours < 24) updatedText = `${hours}h ago`;
    else updatedText = new Date(lastChanged).toLocaleString();
    isStale = diff > 10 * 60 * 1000;
  }

  return (
    <div className="text-right">
      <div className="text-2xl font-mono text-foreground tabular-nums">
        {timeStr}
      </div>
      <p className={`text-xs ${isStale ? "text-destructive" : "text-muted-foreground"}`}>
        Updated: {updatedText}
      </p>
    </div>
  );
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState("home");
  const [isParametersExpanded, setIsParametersExpanded] = useState(true);
  const [isSystemSettingsExpanded, setIsSystemSettingsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectStart, setNewProjectStart] = useState("");
  const [newProjectEnd, setNewProjectEnd] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);

  const { logout } = useAuth();
  const { alerts, checkAlerts, clearAllAlerts } = useAlerts();
  const { checkDosingEvents } = useDosing();
  const { thresholds } = useThresholds();
  const { latestReading, lastUpdated: lastChanged } = useSharedSensorData();
  const { theme, toggleTheme } = useTheme();
  const { isMaintenance, toggleMaintenance } = useMaintenance();
  const { activeProject, isReadOnly, projects, setActiveProject, createProject, deleteProject } = useProject();

  useEffect(() => {
    if (latestReading && !isMaintenance && !isReadOnly) {
      checkAlerts(latestReading, thresholds);
      checkDosingEvents(latestReading);
    }
  }, [latestReading, thresholds, checkAlerts, checkDosingEvents, isMaintenance, isReadOnly]);

  // Clear alerts when entering maintenance mode or read-only project view
  useEffect(() => {
    if (isMaintenance || isReadOnly) {
      clearAllAlerts();
    }
  }, [isMaintenance, isReadOnly, clearAllAlerts]);

  const hasAlerts = alerts.length > 0;
  const alertMessages = alerts.map((a) => a.message).join("|");

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="flex items-center gap-2 text-sidebar-foreground">
            <Beaker className="w-6 h-6 text-emerald-400" />
            Menu
          </h1>
        </div>

        {/* Navigation */}

        <nav className="flex-1 p-4 overflow-y-auto space-y-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
              activeTab === "home"
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground hover:bg-sidebar-accent/20"
            }`}
          >
            <Home className="w-5 h-5 text-emerald-400" />
            Home Page
          </button>

          {/* Project Selector */}
          <div className="border border-sidebar-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                value={activeProject?.id ?? ""}
                onChange={(e) => {
                  const p = projects.find((proj) => proj.id === Number(e.target.value));
                  setActiveProject(p ?? null);
                }}
                className="flex-1 bg-sidebar text-sidebar-foreground text-sm border border-sidebar-border rounded px-2 py-1 min-w-0"
              >
                <option value="">Live Data</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {isReadOnly && activeProject && (
              <div className="text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1 flex items-center justify-between">
                <span>Viewing old project — read-only</span>
                <button
                  onClick={async () => {
                    if (activeProject && confirm(`Delete "${activeProject.name}"? This cannot be undone.`)) {
                      setDeletingProjectId(activeProject.id);
                      await deleteProject(activeProject.id);
                      setDeletingProjectId(null);
                    }
                  }}
                  disabled={deletingProjectId === activeProject.id}
                  className="ml-2 text-red-400 hover:text-red-300 p-0.5 rounded hover:bg-red-500/20"
                  title="Delete this project"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}

            {!showNewProjectInput ? (
              <Button
                onClick={() => setShowNewProjectInput(true)}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                <FolderPlus className="w-3 h-3 mr-1" />
                New Project
              </Button>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="w-full bg-sidebar text-sidebar-foreground text-sm border border-sidebar-border rounded px-2 py-1"
                  autoFocus
                />
                <input
                  type="date"
                  value={newProjectStart}
                  onChange={(e) => setNewProjectStart(e.target.value)}
                  className="w-full bg-sidebar text-sidebar-foreground text-sm border border-sidebar-border rounded px-2 py-1"
                />
                <input
                  type="date"
                  value={newProjectEnd}
                  onChange={(e) => setNewProjectEnd(e.target.value)}
                  className="w-full bg-sidebar text-sidebar-foreground text-sm border border-sidebar-border rounded px-2 py-1"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    disabled={!newProjectName.trim() || !newProjectStart || !newProjectEnd || isSavingProject}
                    onClick={async () => {
                      setIsSavingProject(true);
                      try {
                        const start = new Date(newProjectStart);
                        start.setHours(0, 0, 0, 0);
                        const end = new Date(newProjectEnd);
                        end.setHours(23, 59, 59, 999);
                        await createProject(newProjectName.trim(), start, end);
                        setNewProjectName("");
                        setNewProjectStart("");
                        setNewProjectEnd("");
                        setShowNewProjectInput(false);
                      } finally {
                        setIsSavingProject(false);
                      }
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setShowNewProjectInput(false);
                      setNewProjectName("");
                      setNewProjectStart("");
                      setNewProjectEnd("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setIsParametersExpanded(!isParametersExpanded)}
              className="w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors text-sidebar-foreground hover:bg-sidebar-accent/20"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span>Parameters</span>
              </div>
              {isParametersExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {isParametersExpanded && (
              <div className="ml-4 space-y-1 border-l-2 border-sidebar-border pl-2">
                <button
                  onClick={() => setActiveTab("ec")}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${
                    activeTab === "ec"
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/20"
                  }`}
                >
                  <Zap className="w-4 h-4 text-emerald-400" />
                  EC
                </button>

                <button
                  onClick={() => setActiveTab("ph")}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${
                    activeTab === "ph"
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/20"
                  }`}
                >
                  <Droplets className="w-4 h-4 text-emerald-400" />
                  pH
                </button>

                <button
                  onClick={() => setActiveTab("temp")}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${
                    activeTab === "temp"
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/20"
                  }`}
                >
                  <Thermometer className="w-4 h-4 text-emerald-400" />
                  Temperature
                </button>

                <button
                  onClick={() => setActiveTab("water")}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${
                    activeTab === "water"
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/20"
                  }`}
                >
                  <Waves className="w-4 h-4 text-emerald-400" />
                  Water Level
                </button>

                <button
                  onClick={() => setActiveTab("waterFlow")}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${
                    activeTab === "waterFlow"
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/20"
                  }`}
                >
                  <Droplets className="w-4 h-4 text-emerald-400" />
                  Water Flow
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab("thresholds")}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
              activeTab === "thresholds"
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground hover:bg-sidebar-accent/20"
            }`}
          >
            <Wrench className="w-5 h-5 text-emerald-400" />
            Controls
          </button>

          <div className="space-y-1">
            <button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors text-sidebar-foreground hover:bg-sidebar-accent/20"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-emerald-400" />
                <span>History & Logs</span>
              </div>
              {isHistoryExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {isHistoryExpanded && (
              <div className="ml-4 space-y-1 border-l-2 border-sidebar-border pl-2">
                <button
                  onClick={() => setActiveTab("dosingHistory")}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${
                    activeTab === "dosingHistory"
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/20"
                  }`}
                >
                  <History className="w-4 h-4 text-emerald-400" />
                  Dosing History
                </button>

                <button
                  onClick={() => setActiveTab("alertHistory")}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${
                    activeTab === "alertHistory"
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/20"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-emerald-400" />
                  Alert History
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab("correlation")}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
              activeTab === "correlation"
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground hover:bg-sidebar-accent/20"
            }`}
          >
            <GitCompare className="w-5 h-5 text-emerald-400" />
            Correlation
          </button>

          <button
            onClick={() => setActiveTab("export")}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
              activeTab === "export"
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground hover:bg-sidebar-accent/20"
            }`}
          >
            <Download className="w-5 h-5 text-emerald-400" />
            Export
          </button>

          <hr className="my-4 border-sidebar-border" />

          <button
            onClick={logout}
            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sidebar-foreground hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl text-foreground">Hydroponics Dashboard</h2>
              <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleTheme}
                variant="outline"
                size="icon"
                className="rounded-full border-2 border-teal-300 dark:border-teal-700 hover:scale-110 transition-transform"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-amber-500" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-600" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>

              <LiveClock lastChanged={lastChanged} />
            </div>
          </div>
        </header>

        <div className="p-4 space-y-2 bg-gradient-to-r from-white via-teal-50/50 to-cyan-50/50 dark:from-gray-950 dark:via-teal-950/50 dark:to-cyan-950/50 border-b border-teal-100 dark:border-teal-800">
          {isReadOnly && activeProject && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 py-2">
              <FolderOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-900 dark:text-amber-300 text-sm">
                Viewing Project: {activeProject.name} · Read-only
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                Historical data only. Controls and alerts are disabled.
                <button onClick={() => setActiveProject(null)} className="ml-2 underline font-medium">Return to Live</button>
              </AlertDescription>
            </Alert>
          )}
          {isMaintenance && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 py-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-900 dark:text-amber-300 text-sm">Maintenance Mode Active</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                Data collection and alerts are paused.
                <button onClick={toggleMaintenance} className="ml-2 underline font-medium">Disable</button>
              </AlertDescription>
            </Alert>
          )}
          {hasAlerts &&
            alerts.map((alert, index) => (
              <Alert
                key={`${alert.type}-${index}-${alertMessages}`}
                className="border-destructive bg-destructive/10 py-2"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm">Alert</AlertTitle>
                <AlertDescription className="text-sm">{alert.message}</AlertDescription>
              </Alert>
            ))}

          {!hasAlerts && (
              <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 py-2">
                <AlertCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertTitle className="text-emerald-900 dark:text-emerald-300 text-sm">
                  All systems normal
                </AlertTitle>
                <AlertDescription className="text-emerald-700 dark:text-emerald-400 text-sm">
                  No active alerts. All parameters within acceptable ranges.
                </AlertDescription>
              </Alert>
            )}
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-white/50 via-transparent to-teal-50/20 dark:from-gray-950/50 dark:via-transparent dark:to-teal-950/20">
          {activeTab === "home" && <HomePage />}
          {activeTab === "ec" && <ECPage />}
          {activeTab === "ph" && <PHPage />}
          {activeTab === "temp" && <TemperaturePage />}
          {activeTab === "water" && <WaterLevelPage />}
          {activeTab === "waterFlow" && <WaterFlowPage />}
          {activeTab === "thresholds" && <ThresholdPage />}
          {activeTab === "manual" && <div className="max-w-7xl mx-auto"><p>Page removed.</p></div>}
          {activeTab === "export" && <ExportPage />}
          {activeTab === "dosingHistory" && <DosingHistoryPage />}
          {activeTab === "alertHistory" && <AlertHistoryPage />}
          {activeTab === "correlation" && <CorrelationPage />}
        </div>
      </main>
    </div>
  );
}

export function Dashboard() {
  return (
    <UnitProvider>
      <ThresholdProvider>
        <MaintenanceProvider>
          <ProjectProvider>
            <AlertProvider>
              <DosingProvider>
                <SensorDataProvider>
                  <DashboardContent />
                </SensorDataProvider>
              </DosingProvider>
            </AlertProvider>
          </ProjectProvider>
        </MaintenanceProvider>
      </ThresholdProvider>
    </UnitProvider>
  );
}
