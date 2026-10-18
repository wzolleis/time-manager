import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useApiTokens} from "@/views/api-tokens";
import type {ApiToken} from "@shared/api-token";
import {isTokenExpired} from "@shared/api-token-rules";

export type ApiTokenRow = ApiToken & {expired: boolean; userName?: string};

/** Der User sieht seine Agent-Tokens */
export function useShowApiTokens() {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const tokens = useApiTokens(currentUser?.id);

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
