import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import "@radix-ui/themes/styles.css";

import {Theme} from "@radix-ui/themes";
import {createRouter, RouterProvider} from "@tanstack/react-router";

// Wird vom Router-Plugin automatisch aus src/routes/ generiert
import {routeTree} from './routeTree.gen'

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {UserProvider} from "./components/user-provider";

const queryClient = new QueryClient();

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
            <QueryClientProvider client={queryClient}>
                <UserProvider>
                    <RouterProvider router={router}/>
                </UserProvider>
            </QueryClientProvider>
        </Theme>
    </StrictMode>,
)
