// src/components/user-provider.tsx
import {type ReactNode, useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {fetchMe, ME_QUERY_KEY} from "@/api/auth";
import {UserContext, type UserContextValue} from "@/lib/user-context";
import {Button} from "@/components/ui/button";
import {LoginPage} from "@/features/auth/pages/login-page";

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
        return <p className="p-4 text-sm text-muted-foreground">Lade…</p>;
    }
    if (isError) {
        return (
            <div className="space-y-2 p-4">
                <p role="alert" className="text-sm text-destructive">
                    {error.message}
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                    Erneut versuchen
                </Button>
            </div>
        );
    }
    if (!value) return <LoginPage />;

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
