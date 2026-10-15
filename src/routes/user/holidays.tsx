import {createFileRoute} from '@tanstack/react-router'
import {UserHolidaysPage} from "@user/holidays/pages/holidays-page.tsx";

export const Route = createFileRoute('/user/holidays')({
    component: UserHolidaysPage,
})
