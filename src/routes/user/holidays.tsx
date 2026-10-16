import {createFileRoute} from '@tanstack/react-router'
import {HolidaysPage} from "@features/holidays/pages/holidays-page.tsx";

export const Route = createFileRoute('/user/holidays')({
    component: HolidaysPage,
})
