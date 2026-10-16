import {HolidayList} from "@features/holidays/components/holiday-list";

export const HolidaysPage = () => (
    <div className="p-4">
        <HolidayList scope="user"/>
    </div>
);
