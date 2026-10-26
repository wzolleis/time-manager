// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/login/user-provider";
import {NotFound} from "@/application/layout/not-found";
import {SOLL_SETTING_ID, VACATION_DAYS_SETTING_ID} from "@shared/user-setting";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
};

const SETTINGS = [
    {
        id: SOLL_SETTING_ID,
        name: "Soll",
        description: "Die Anzahl der Stunden, die pro Tag gearbeitet wird. Das heißt auch Soll.",
        type: "number",
        unit: "hour",
        defaultValue: "8",
        validFromUnit: "day",
    },
    {
        id: VACATION_DAYS_SETTING_ID,
        name: "Urlaubstage",
        description: "Die Anzahl der Urlaubstage pro Jahr",
        type: "number",
        unit: "day",
        defaultValue: "30",
        validFromUnit: "year",
    },
];

const value = (id: string, v: string, validFrom: string) => ({
    id,
    userId: USER.id,
    settingId: SOLL_SETTING_ID,
    value: v,
    validFrom,
});

function mockApi(values: unknown[]) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const {pathname} = new URL(raw, "http://localhost");
        if (pathname === "/api/auth/me") return Response.json(USER);
        if (pathname === "/api/users") return Response.json([USER]);
        if (pathname === `/api/users/${USER.id}/settings`) {
            if (init?.method === "POST") return Response.json(value("neu", "6", "2026-10-15"), {status: 201});
            return Response.json({settings: SETTINGS, values});
        }
        return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderPage() {
    const router = createRouter({
        routeTree,
        defaultNotFoundComponent: NotFound,
        history: createMemoryHistory({initialEntries: ["/user/settings"]}),
    });
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <RouterProvider router={router} />
            </UserProvider>
        </QueryClientProvider>,
    );
}

const rowOf = (text: string) => screen.getByText(text).closest("tr")!;

beforeEach(() => {
    // Nur Date fälschen, Timer laufen normal weiter (React Query, findBy*)
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(new Date("2026-10-14T12:00:00"));
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}

            unobserve() {}

            disconnect() {}
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

describe("Einstellungen", () => {
    it("zeigt ohne eigene Werte die Defaults als aktuell", async () => {
        mockApi([]);
        renderPage();

        await screen.findByText("8 Stunden");
        const soll = rowOf("8 Stunden");
        expect(within(soll).getByText("aktuell")).toBeTruthy();
        expect(within(soll).getByText("–")).toBeTruthy(); // ohne gültig ab
        expect(within(rowOf("30 Tage")).getByText("aktuell")).toBeTruthy();
    });

    it("zeigt abgelaufene, aktuelle und geplante Werte mit den passenden Aktionen", async () => {
        mockApi([value("a", "6", "2026-03-01"), value("b", "7", "2026-11-01")]);
        renderPage();

        await screen.findByText("6 Stunden");
        expect(within(rowOf("8 Stunden")).getByText("abgelaufen")).toBeTruthy();
        expect(within(rowOf("8 Stunden")).queryByRole("button")).toBeNull();

        const current = rowOf("6 Stunden");
        expect(within(current).getByText("aktuell")).toBeTruthy();
        expect(within(current).getByText("01.03.2026")).toBeTruthy();
        expect(within(current).getByRole("button", {name: "Ändern"})).toBeTruthy();
        expect(within(current).queryByRole("button", {name: "Löschen"})).toBeNull();

        const planned = rowOf("7 Stunden");
        expect(within(planned).getByText("geplant")).toBeTruthy();
        expect(within(planned).getByRole("button", {name: "Bearbeiten"})).toBeTruthy();
        expect(within(planned).getByRole("button", {name: "Löschen"})).toBeTruthy();
    });

    it("lehnt mit eigenem Wert ein rückwirkendes gültig ab im Dialog ab", async () => {
        mockApi([value("a", "6", "2026-03-01")]);
        renderPage();

        await screen.findByText("6 Stunden");
        fireEvent.click(within(rowOf("6 Stunden")).getByRole("button", {name: "Ändern"}));

        const from = await screen.findByLabelText("gültig ab");
        expect((from as HTMLInputElement).value).toBe("2026-10-15"); // morgen
        fireEvent.change(from, {target: {value: "2026-10-01"}});
        expect(screen.getByText(/muss in der Zukunft liegen/)).toBeTruthy();
        expect(screen.getByRole("button", {name: "Speichern"}).hasAttribute("disabled")).toBe(true);
    });

    it("speichert einen neuen Wert ab morgen", async () => {
        const fetchMock = mockApi([]);
        renderPage();

        await screen.findByText("8 Stunden");
        fireEvent.click(within(rowOf("8 Stunden")).getByRole("button", {name: "Ändern"}));
        fireEvent.change(await screen.findByLabelText("Wert"), {target: {value: "6"}});
        fireEvent.click(screen.getByRole("button", {name: "Speichern"}));

        await waitFor(() => {
            const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
            expect(JSON.parse(String(post?.[1]?.body))).toEqual({
                settingId: SOLL_SETTING_ID,
                value: "6",
                validFrom: "2026-10-15",
            });
        });
    });
});
