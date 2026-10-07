import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import "@radix-ui/themes/styles.css";
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client'
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister'

import {Theme} from "@radix-ui/themes";
import {createRouter, RouterProvider} from "@tanstack/react-router";

// Wird vom Router-Plugin automatisch aus src/routes/ generiert
import {routeTree} from './routeTree.gen'

import {QueryClient} from "@tanstack/react-query";
import {UserProvider} from "./components/user-provider";

const queryClient = new QueryClient(
    {
        defaultOptions: {
            queries: {
                gcTime: 1000 * 60 * 60 * 24, // 24 hours
            },
        }
    }
);

const router = createRouter({routeTree})

// Typsicherheit für <Link>, useNavigate usw.
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

const rootElement = document.getElementById('root')!

const persister = createAsyncStoragePersister({
    storage: window.localStorage,
})


createRoot(rootElement).render(
    <StrictMode>
        <Theme>
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{persister}}
            >
                <UserProvider>
                    <RouterProvider router={router}/>
                </UserProvider>
            </PersistQueryClientProvider>
        </Theme>
    </StrictMode>,
)
