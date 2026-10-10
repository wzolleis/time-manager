import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import "@radix-ui/themes/styles.css";
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client'

import {Theme} from "@radix-ui/themes";
import {createRouter, RouterProvider} from "@tanstack/react-router";

// Wird vom Router-Plugin automatisch aus src/routes/ generiert
import {routeTree} from './routeTree.gen'
import {UserProvider} from "./components/user-provider";
import {persistOptions, queryClient} from "@/query-client.ts";


const router = createRouter({routeTree})

// Typsicherheit für <Link>, useNavigate usw.
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

const rootElement = document.getElementById('root')!


createRoot(rootElement).render(
    <StrictMode>
        <Theme>
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={persistOptions}
            >
                <UserProvider>
                    <RouterProvider router={router}/>
                </UserProvider>
            </PersistQueryClientProvider>
        </Theme>
    </StrictMode>,
)
