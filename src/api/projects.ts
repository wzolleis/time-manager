// src/api/projects.ts
import {request} from "./http";
import type {Project, ProjectCreate, ProjectUpdate} from "@shared/project";

export const fetchProjects = () => request<Project[]>("/api/projects");

export const createProject = (data: ProjectCreate) =>
    request<Project>("/api/projects", {method: "POST", body: JSON.stringify(data)});

export const updateProject = (id: string, data: ProjectUpdate) =>
    request<Project>(`/api/projects/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteProject = (id: string) => request<void>(`/api/projects/${id}`, {method: "DELETE"});
