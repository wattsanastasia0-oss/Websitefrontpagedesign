import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Project {
  id: number;
  name: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProjectContextType {
  projects: Project[];
  liveProject: Project | null;   // the currently active (live) project
  viewingProject: Project | null; // which project is selected in the dropdown
  setViewingProject: (project: Project) => void;
  createProject: (name: string) => Promise<boolean>;
  deleteProject: (id: number) => Promise<boolean>;
  isReadOnly: boolean; // true when viewing an old (non-active) project
  isLoadingProjects: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [liveProject, setLiveProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProjectState] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Failed to load projects:", error);
      setIsLoadingProjects(false);
      return;
    }

    const list: Project[] = data || [];
    setProjects(list);

    const active = list.find((p) => p.is_active) ?? null;
    setLiveProject(active);

    // Default to viewing the live project
    setViewingProjectState((prev) => {
      if (prev) return list.find((p) => p.id === prev.id) ?? active;
      return active;
    });

    setIsLoadingProjects(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const setViewingProject = useCallback((project: Project) => {
    setViewingProjectState(project);
  }, []);

  const createProject = useCallback(async (name: string): Promise<boolean> => {
    try {
      // Close the current active project
      if (liveProject) {
        const { error: endErr } = await supabase
          .from("projects")
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq("id", liveProject.id);
        if (endErr) { console.error("Failed to close current project:", endErr); return false; }
      }

      // Create the new active project
      const { data, error } = await supabase
        .from("projects")
        .insert([{ name, is_active: true }])
        .select()
        .single();
      if (error || !data) { console.error("Failed to create project:", error); return false; }

      await loadProjects();
      return true;
    } catch (err) {
      console.error("Error creating project:", err);
      return false;
    }
  }, [liveProject, loadProjects]);

  const deleteProject = useCallback(async (id: number): Promise<boolean> => {
    try {
      if (liveProject?.id === id) return false; // can't delete the active project
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) { console.error("Failed to delete project:", error); return false; }
      // If we were viewing the deleted project, switch back to live
      setViewingProjectState((prev) =>
        prev?.id === id ? liveProject : prev
      );
      await loadProjects();
      return true;
    } catch (err) {
      console.error("Error deleting project:", err);
      return false;
    }
  }, [liveProject, loadProjects]);

  const isReadOnly = !!(viewingProject && liveProject && viewingProject.id !== liveProject.id);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        liveProject,
        viewingProject,
        setViewingProject,
        createProject,
        deleteProject,
        isReadOnly,
        isLoadingProjects,
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

  return ctx;
}
