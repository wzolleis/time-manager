// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/user-provider";
import {NotFound} from "@/components/navigation/not-found";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
};

const GLOBAL = {id: "g", userId: null, date: "2026-10-03", name: "Tag der Deutschen Einheit"};
const OWN = {id: "o", userId: USER.id, date: "2026-11-01", name: "Allerheiligen"};

// Der Server liefert ohne userId nur die globalen, mit userId auch die eigenen
function mockApi() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const url = new URL(raw, "http://localhost");
        if (url.pathname === "/api/auth/me") return Response.json(USER);
        if (url.pathname === "/api/users") return Response.json([USER]);
        if (url.pathname === "/api/holidays") {
            return Response.json(url.searchParams.get("userId") ? [GLOBAL, OWN] : [GLOBAL]);
        }
        return Response.json({error: `Nicht gemockt: ${url.pathname}`}, {status: 404});
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderPage(path: string) {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: [path]}),
    });
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <RouterProvider router={router}/>
            </UserProvider>
        </QueryClientProvider>,
    );
}

const rowOf = (text: string) => screen.getByText(text).closest("tr")!;

beforeEach(() => {
    // Nur Date fälschen, Timer laufen normal weiter (React Query, findBy*)
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(new Date("2026-06-10T12:00:00"));
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {
            }

            unobserve() {
            }

            disconnect() {
            }
        },
    );
    vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe("Feiertage im User-Bereich", () => {
    it("zeigt globale und eigene, nur die eigenen sind änderbar", async () => {
        mockApi();
        renderPage("/user/holidays");

        await screen.findByText("Allerheiligen");
        const global = rowOf("Tag der Deutschen Einheit");
        expect(within(global).getByText("alle")).toBeTruthy();
        expect(within(global).getByText(/Wochenende/)).toBeTruthy(); // 03.10.2026 ist ein Samstag
        expect(within(global).queryByRole("button", {name: "Bearbeiten"})).toBeNull();

        const own = rowOf("Allerheiligen");
        expect(within(own).getByText("nur mich")).toBeTruthy();
        expect(within(own).getByRole("button", {name: "Bearbeiten"})).toBeTruthy();
        expect(within(own).getByRole("button", {name: "Löschen"})).toBeTruthy();
    });
});

describe("Feiertage im Admin-Bereich", () => {
    it("lädt nur die globalen und lässt sie ändern", async () => {
        const fetchMock = mockApi();
        renderPage("/admin/holidays");

        await screen.findByText("Tag der Deutschen Einheit");
        expect(screen.queryByText("Allerheiligen")).toBeNull();
        expect(within(rowOf("Tag der Deutschen Einheit")).getByRole("button", {name: "Bearbeiten"})).toBeTruthy();

        const holidayCalls = fetchMock.mock.calls
            .map(([input]) => String(input))
            .filter((u) => u.includes("/api/holidays"));
        expect(holidayCalls).toEqual(["/api/holidays"]);
    });
});
