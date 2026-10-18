import {useQuery} from "@tanstack/react-query";
import {fetchAllApiTokens, fetchApiTokens} from "@/api/api-tokens";

// Alle Keys beginnen mit "api-tokens": ein invalidate auf ["api-tokens"] trifft beide Listen

/** Die eigenen Agent-Tokens des Users. Der Server liefert immer die des angemeldeten Users. */
export const useApiTokens = (userId: string | undefined) =>
    useQuery({
        queryKey: ["api-tokens", userId],
        queryFn: fetchApiTokens,
        enabled: !!userId,
    });

/** Die Agent-Tokens aller User */
export const useAllApiTokens = () =>
    useQuery({
        queryKey: ["api-tokens", "all"],
        queryFn: fetchAllApiTokens,
    });
