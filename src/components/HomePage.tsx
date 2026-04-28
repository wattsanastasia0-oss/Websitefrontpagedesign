import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Wrench, Loader2, AlertCircle } from "lucide-react";
import { useUnits } from "./UnitContext";
import { useAlerts } from "./AlertContext";
import { useSharedSensorData } from "./SensorDataContext";
import { useMaintenance } from "./MaintenanceContext";
import { downsample } from "../utils/downsample";

const MAX_CHART_POINTS = 1500;

export function HomePage() {
  const { tempUnit } = useUnits();
  const { } = useAlerts();
  const { readings, latestReading, isLoading, error } = useSharedSensorData();
  const { isMaintenance, toggleMaintenance } = useMaintenance();

  // Convert data based on selected units — show last 24 hours
  const data = useMemo(() => {
    if (readings.length === 0) return [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = readings.filter(d => d.timestamp >= cutoff);
    return downsample(filtered, MAX_CHART_POINTS).map(d => ({
        date: new Date(d.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      ec: d.ec,
      ph: d.ph,
      temp: tempUnit === "C" ? d.temperature : (d.temperature * 9 / 5) + 32,
      o2: d.o2,
      transpirationRate: d.transpirationRate || 0,
    }));
  }, [readings, tempUnit]);

  // Loading state
  if (isLoading && readings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && readings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-lg font-semibold">Failed to load sensor data</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // No data yet state
  if (readings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-semibold">Waiting for sensor data...</p>
          <p className="text-muted-foreground">Data will appear once readings are received</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Water Quality Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EC Graph */}
        <Card>
          <CardHeader>
            <CardTitle>EC (Electrical Conductivity)</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  className="text-xs" 
                  domain={[0, (max: number) => Math.max(1, Math.ceil(max * 1.05))]}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [value.toFixed(0) + ' μS/cm', 'EC']}
                />
                <Line 
                  type="monotone" 
                  dataKey="ec" 
                  stroke="#0d9488" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* pH Graph */}
        <Card>
          <CardHeader>
            <CardTitle>pH Level</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  className="text-xs" 
                  domain={[0, (max: number) => Math.ceil(max + 0.5)]}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [value.toFixed(1), 'pH']}
                />
                <Line 
                  type="monotone" 
                  dataKey="ph" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Temperature Graph */}
        <Card>
          <CardHeader>
            <CardTitle>Temperature</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  className="text-xs" 
                  domain={[0, (max: number) => Math.ceil(max + 2)]}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [value.toFixed(1) + ` °${tempUnit}`, 'Temperature']}
                />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#14b8a6" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* O2 Graph */}
        <Card>
          <CardHeader>
            <CardTitle>Dissolved O₂</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  className="text-xs" 
                  domain={[0, (max: number) => Math.max(1, Math.ceil(max * 1.05))]}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [value.toFixed(1) + ' %', 'Dissolved O₂']}
                />
                <Line 
                  type="monotone" 
                  dataKey="o2" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Mode */}
      <Card className={`mt-6 border-2 ${
        isMaintenance
          ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
          : "border-border"
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className={`w-5 h-5 ${isMaintenance ? "text-amber-500" : "text-muted-foreground"}`} />
              <div>
                <CardTitle className={`text-base ${isMaintenance ? "text-amber-700 dark:text-amber-300" : ""}`}>
                  Maintenance Mode
                </CardTitle>
                <CardDescription className={isMaintenance ? "text-amber-600 dark:text-amber-400" : ""}>
                  {isMaintenance
                    ? "Data collection and alerts are paused"
                    : "Pause data collection and alerts for system maintenance"}
                </CardDescription>
              </div>
            </div>
            <Switch
              id="maintenance-toggle"
              checked={isMaintenance}
              onCheckedChange={toggleMaintenance}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </CardHeader>
        {isMaintenance && (
          <CardContent className="pt-0">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              The system will not poll for new sensor readings, generate alerts, or log dosing events while maintenance mode is active.
              Historical data remains visible. Turn off maintenance mode when servicing is complete.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}