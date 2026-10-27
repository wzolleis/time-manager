import {HolidayList} from "@features/holidays/components/holiday-list";
import {Page} from "@/components/page/page";

export const AdminHolidaysPage = () => (
    <Page>
        <HolidayList scope="global" />
    </Page>
);
