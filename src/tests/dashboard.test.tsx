// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/login/user-provider";
import {ADMIN_ROLE_ID, USER_ROLE_ID} from "@shared/role";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    roleIds: [USER_ROLE_ID],
};
const ADMIN = {...USER, roleIds: [USER_ROLE_ID, ADMIN_ROLE_ID]};

function mockApi(me: typeof USER) {
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const {pathname} = new URL(raw, "http://localhost");
            if (pathname === "/api/auth/me") return Response.json(me);
            return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
        }),
    );
}

function renderApp(path: string) {
    const router = createRouter({routeTree, history: createMemoryHistory({initialEntries: [path]})});
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <RouterProvider router={router} />
            </UserProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    // Radix-Komponenten brauchen ResizeObserver, jsdom bringt ihn nicht mit
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}

            unobserve() {}

            disconnect() {}
        },
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("Dashboard", () => {
    it("zeigt dem User nur die Karte zum User Dashboard", async () => {
        mockApi(USER);
        renderApp("/dashboard");

        const link = await screen.findByRole("link", {name: "Zum User Dashboard"});
        expect(link.getAttribute("href")).toBe("/user");
        expect(screen.queryByRole("link", {name: "Zum Administrator Dashboard"})).toBeNull();
    });

    it("zeigt dem Administrator zusätzlich die Karte zum Administrator Dashboard", async () => {
        mockApi(ADMIN);
        renderApp("/dashboard");

        const link = await screen.findByRole("link", {name: "Zum Administrator Dashboard"});
        expect(link.getAttribute("href")).toBe("/admin");
        expect(screen.getByRole("link", {name: "Zum User Dashboard"})).toBeTruthy();
    });
});
