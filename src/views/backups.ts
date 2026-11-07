import {useQuery} from "@tanstack/react-query";
import {fetchBackups} from "@/api/backups";

/** Die letzten Läufe des Datenbank-Backups und das Datum der letzten Kopie */
export const useBackups = () =>
    useQuery({
        queryKey: ["backups"],
        queryFn: fetchBackups,
    });
