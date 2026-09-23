import { createFileRoute } from '@tanstack/react-router'
import {Dashboard} from "@features/dashboard/pages/dashboard.tsx";

export const Route = createFileRoute('/')({
  component: Dashboard,
})