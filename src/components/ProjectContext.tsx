import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Project {
  id: number;
  name: string;
  started_at: string; // ISO string
  ended_at: string;   // ISO string
  created_at: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null; // null = live mode
  isReadOnly: boolean;
  isLoadingProjects: boolean;
  setActiveProject: (project: Project | null) => void;
  createProject: (name: string, startedAt: Date, endedAt: Date) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("started_at", { ascending: false });
      if (!error && data) setProjects(data as Project[]);
      setIsLoadingProjects(false);
    })();
  }, []);

  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project);
  }, []);

  const createProject = useCallback(async (name: string, startedAt: Date, endedAt: Date) => {
    const { data, error } = await supabase
      .from("projects")
      .insert([{ name, started_at: startedAt.toISOString(), ended_at: endedAt.toISOString() }])
      .select()
      .single();
    if (error) throw error;
    setProjects((prev) => [data as Project, ...prev]);
  }, []);

  const deleteProject = useCallback(async (id: number) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setActiveProjectState((prev) => (prev?.id === id ? null : prev));
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        isReadOnly: activeProject !== null,
        isLoadingProjects,
        setActiveProject,
        createProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
