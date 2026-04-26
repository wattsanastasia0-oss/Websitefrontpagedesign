import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Trash2, FolderOpen, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Badge } from "./ui/badge";
import { useProject } from "./ProjectContext";

export function ProjectsPage() {
  const { projects, activeProject, setActiveProject, createProject, deleteProject } = useProject();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Please enter a project name."); return; }
    if (!startDate) { toast.error("Please select a start date."); return; }
    if (!endDate) { toast.error("Please select an end date."); return; }
    if (endDate < startDate) { toast.error("End date must be after start date."); return; }

    setIsSaving(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      await createProject(name.trim(), start, end);
      setName("");
      setStartDate(undefined);
      setEndDate(undefined);
      toast.success(`Project "${name.trim()}" created.`);
    } catch {
      toast.error("Failed to create project.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, projectName: string) => {
    setDeletingId(id);
    try {
      await deleteProject(id);
      toast.success(`Project "${projectName}" deleted.`);
    } catch {
      toast.error("Failed to delete project.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Active project banner */}
      {activeProject && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Viewing: <span className="font-bold">{activeProject.name}</span>
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {format(new Date(activeProject.started_at), "MMM d, yyyy")} — {format(new Date(activeProject.ended_at), "MMM d, yyyy")} · Read-only
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveProject(null)}>
            Return to Live
          </Button>
        </div>
      )}

      {/* Create new project */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            Save New Project
          </CardTitle>
          <CardDescription>
            Archive a date range of sensor data as a named read-only project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              placeholder="e.g. Spring Grow 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(d) => d > today}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(d) => d > today || (startDate ? d < startDate : false)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button onClick={handleCreate} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Save Project
          </Button>
        </CardContent>
      </Card>

      {/* Project list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
            Saved Projects
          </CardTitle>
          <CardDescription>
            Select a project to view its historical data in read-only mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No projects saved yet.
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const isActive = activeProject?.id === project.id;
                return (
                  <div
                    key={project.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isActive
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                        : "border-border hover:border-emerald-400/50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.name}</span>
                        {isActive && (
                          <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(project.started_at), "MMM d, yyyy")} — {format(new Date(project.ended_at), "MMM d, yyyy")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Button variant="outline" size="sm" onClick={() => setActiveProject(null)}>
                          Exit
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveProject(project)}
                          className="border-emerald-400/50 hover:border-emerald-400"
                        >
                          View
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deletingId === project.id}
                        onClick={() => handleDelete(project.id, project.name)}
                      >
                        {deletingId === project.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
