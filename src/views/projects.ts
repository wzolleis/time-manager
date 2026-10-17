import {useQuery} from "@tanstack/react-query";
import {fetchProjects} from "@/api/projects";

/** Alle Projekte */
export const useProjects = (enabled = true) =>
    useQuery({
        queryKey: ["projects"],
        queryFn: fetchProjects,
        enabled,
    });
