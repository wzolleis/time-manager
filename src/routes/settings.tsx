import { createFileRoute } from '@tanstack/react-router'
import {SettingsHome} from "@features/settings/pages/settings-home.tsx";

export const Route = createFileRoute('/settings')({
    component: SettingsHome,
})

