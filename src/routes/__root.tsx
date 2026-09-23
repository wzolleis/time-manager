import {createRootRoute} from '@tanstack/react-router'
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";
import ApplicationLayout from "@/application/layout/compoents/application-layout.tsx";

export const Route = createRootRoute({
    component: () => (
        <>
            {/* Im Content vom Layout steht das Outlet */}
            <ApplicationLayout/>
            <TanStackRouterDevtools position="bottom-right" initialIsOpen={false}/>
        </>

    ),
})