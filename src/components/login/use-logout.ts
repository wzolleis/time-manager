import {useQueryClient} from "@tanstack/react-query";
import {logout, ME_QUERY_KEY} from "@/api/auth";
import {clearUserData} from "@/query-client";

/** Der User meldet sich ab, danach zeigt der UserProvider die Login-Seite */
export function useLogout(): () => Promise<void> {
    const qc = useQueryClient();

    return async () => {
        try {
            await logout();
        } finally {
            // Auch wenn der Server nicht erreichbar ist: lokal nichts vom User zurücklassen
            await clearUserData();
            qc.setQueryData(ME_QUERY_KEY, null);
        }
    };
}
