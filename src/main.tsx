import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import {PersistQueryClientProvider} from "@tanstack/react-query-persist-client";

import {createRouter, RouterProvider} from "@tanstack/react-router";

// Wird vom Router-Plugin automatisch aus src/routes/ generiert
import {routeTree} from "./routeTree.gen";
import {UserProvider} from "./components/login/user-provider";
import {persistOptions, queryClient} from "@/query-client";
import {NotFound} from "@/application/layout/not-found";

const router = createRouter({
    routeTree,
    defaultNotFoundComponent: NotFound,
});

// Typsicherheit für <Link>, useNavigate usw.
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const rootElement = document.getElementById("root")!;

createRoot(rootElement).render(
    <StrictMode>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <UserProvider>
                <RouterProvider router={router} />
            </UserProvider>
        </PersistQueryClientProvider>
    </StrictMode>,
);
