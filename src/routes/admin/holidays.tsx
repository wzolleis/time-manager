import {createFileRoute} from '@tanstack/react-router'
import {AdminHolidaysPage} from "@features/holidays/pages/admin-holidays-page";

export const Route = createFileRoute('/admin/holidays')({
    component: AdminHolidaysPage,
})
