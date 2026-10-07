// src/api/projects.ts
import {request} from "./http";
import type {Project} from "@shared/time-entry";

export const fetchProjects = () => request<Project[]>("/api/projects");