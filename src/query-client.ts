import {QueryClient} from "@tanstack/react-query";
import {createAsyncStoragePersister} from "@tanstack/query-async-storage-persister";

export const DAY = 1000 * 60 * 60 * 24;
export const MINUTE_5 = 5 * 60 * 1000

const persister = createAsyncStoragePersister({
    storage: window.localStorage,
})

export const persistOptions = {
    persister,            // dein bestehender localStorage-Persister
    maxAge: DAY,
    buster: "1",         // erhöhen, wenn sich das Datenformat ändert
};

export const queryClient = new QueryClient(
    {
        defaultOptions: {
            queries: {
                gcTime: DAY, staleTime: MINUTE_5
            },
        }
    }
);