import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useAllApiTokens} from "@/views/api-tokens";
import {isTokenExpired} from "@shared/api-token-rules";
import type {ApiTokenRow} from "@features/api-tokens/use-cases/use-show-api-tokens";

/** Der Administrator sieht die Agent-Tokens aller User */
export function useShowAllApiTokens() {
    const now = useNow();
    const tokens = useAllApiTokens();

    const rows = useMemo<ApiTokenRow[] | undefined>(
        () => tokens.data?.map((t) => ({...t, expired: isTokenExpired(t.expiresAt, new Date(now))})),
        [tokens.data, now],
    );

    return {
        rows,
        isPending: tokens.isPending,
        error: tokens.error,
        retry: () => tokens.refetch(),
    };
}
