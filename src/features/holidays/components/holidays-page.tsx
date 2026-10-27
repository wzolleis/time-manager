import {HolidayList} from "@features/holidays/components/holiday-list";
import {Page} from "@/components/page/page";

export const HolidaysPage = () => (
    <Page>
        <HolidayList scope="user" />
    </Page>
);
