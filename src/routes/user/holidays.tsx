import {createFileRoute} from "@tanstack/react-router";
import {HolidaysPage} from "@features/holidays/components/holidays-page";

export const Route = createFileRoute("/user/holidays")({
    component: HolidaysPage,
});
