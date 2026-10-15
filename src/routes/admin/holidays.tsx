import {createFileRoute} from '@tanstack/react-router'
import {AdminHolidaysPage} from "@features/admin/holidays/pages/holidays-page.tsx";

export const Route = createFileRoute('/admin/holidays')({
    component: AdminHolidaysPage,
})
