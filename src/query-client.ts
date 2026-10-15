import {defaultShouldDehydrateQuery, MutationCache, QueryCache, QueryClient} from "@tanstack/react-query";
import {createAsyncStoragePersister} from "@tanstack/query-async-storage-persister";
import {ApiError} from "@/api/http.ts";
import {ME_QUERY_KEY} from "@/api/auth.ts";

export const DAY = 1000 * 60 * 60 * 24;
export const MINUTE_5 = 5 * 60 * 1000

export const persister = createAsyncStoragePersister({
    storage: window.localStorage,
})

export const persistOptions = {
    persister,            // dein bestehender localStorage-Persister
    maxAge: DAY,
    buster: "1",         // erhöhen, wenn sich das Datenformat ändert
    dehydrateOptions: {
        // Den Anmeldestatus nie aus dem Speicher übernehmen, sondern immer beim Server erfragen
        shouldDehydrateQuery: (query: Parameters<typeof defaultShouldDehydrateQuery>[0]) =>
            query.queryKey[0] !== ME_QUERY_KEY[0] && defaultShouldDehydrateQuery(query),
    },
};

// Antwortet der Server mit 401, ist die Session abgelaufen: dann zurück zur Anmeldung
const onError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
        queryClient.setQueryData(ME_QUERY_KEY, null);
    }
};

export const queryClient = new QueryClient(
    {
        queryCache: new QueryCache({onError}),
        mutationCache: new MutationCache({onError}),
        defaultOptions: {
            queries: {
                gcTime: DAY, staleTime: MINUTE_5,
                // Ohne Anmeldung (401) oder ohne Rechte (403) hilft ein erneuter Versuch nicht
                retry: (failureCount, err) =>
                    !(err instanceof ApiError && (err.status === 401 || err.status === 403)) && failureCount < 3,
            },
        }
    }
);

/** Entfernt alle Daten des bisherigen Users aus dem Cache und aus dem localStorage */
export async function clearUserData(): Promise<void> {
    queryClient.removeQueries({predicate: (q) => q.queryKey[0] !== ME_QUERY_KEY[0]});
    await persister.removeClient();
}
