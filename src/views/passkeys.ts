import {useQuery} from "@tanstack/react-query";
import {fetchPasskeys} from "@/api/passkeys";

/** Die eigenen Passkeys des Users. Der Server liefert immer die des angemeldeten Users. */
export const usePasskeys = (userId: string | undefined) =>
    useQuery({
        queryKey: ["passkeys", userId],
        queryFn: fetchPasskeys,
        enabled: !!userId,
    });
