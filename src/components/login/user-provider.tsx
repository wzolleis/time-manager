// src/components/login/user-provider.tsx
import {type ReactNode, useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {fetchMe, ME_QUERY_KEY} from "@/api/auth";
import {UserContext, type UserContextValue} from "@/lib/user-context";
import {LoginPage} from "@/components/login/login-page";
import {LoadError} from "@/components/text/load-error";
import {Loading} from "@/components/text/loading";

// Der aktuelle User ist immer der angemeldete. Ohne Session gibt es nur die Login-Seite.
export function UserProvider({children}: {children: ReactNode}) {
    const {
        data: currentUser,
        isPending,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ME_QUERY_KEY,
        queryFn: fetchMe,
    });

    const value = useMemo<UserContextValue | null>(() => (currentUser ? {currentUser} : null), [currentUser]);

    if (isPending) {
        return <Loading className="p-4" />;
    }
    if (isError) {
        return <LoadError error={error} onRetry={() => refetch()} className="p-4" />;
    }
    if (!value) return <LoginPage />;

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
