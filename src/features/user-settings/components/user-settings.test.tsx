// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createMemoryHistory, createRouter, RouterProvider} from "@tanstack/react-router";
import {routeTree} from "@/routeTree.gen";
import {UserProvider} from "@/components/login/user-provider";
import {NotFound} from "@/application/layout/not-found";
import {SHOW_ACTION_BAR_SETTING_ID, SOLL_SETTING_ID, VACATION_DAYS_SETTING_ID} from "@shared/user-setting";

const USER = {
    id: "275f12fb-e116-4857-9f12-fbe116b857fb",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    roleIds: [],
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
    {
        id: SHOW_ACTION_BAR_SETTING_ID,
        name: "show_action_bar",
        description: "Zeige die Action-Bar an",
        type: "boolean",
        unit: null,
        defaultValue: "true",
        validFromUnit: "immediately",
    },
];

const value = (id: string, v: string | null, validFrom: string) => ({
    id,
    userId: USER.id,
    settingId: SOLL_SETTING_ID,
    value: v,
    validFrom,
});

// Einstellung ohne Historie: der Server überschreibt den Wert und setzt heute als gültig ab
const actionBarValue = (v: string | null) => ({
    ...value("bar", v, "2026-10-14"),
    settingId: SHOW_ACTION_BAR_SETTING_ID,
});

function mockApi(values: ReturnType<typeof value>[]) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const {pathname} = new URL(raw, "http://localhost");
        if (pathname === "/api/auth/me") return Response.json(USER);
        if (pathname === "/api/users") return Response.json([USER]);
        if (pathname === `/api/users/${USER.id}/settings`) {
            if (init?.method === "POST") {
                const body = JSON.parse(String(init.body));
                if (body.settingId !== SHOW_ACTION_BAR_SETTING_ID) {
                    return Response.json(value("neu", "6", "2026-10-15"), {status: 201});
                }
                const saved = actionBarValue(body.value);
                values.splice(
                    0,
                    values.length,
                    ...values.filter((v) => v.settingId !== SHOW_ACTION_BAR_SETTING_ID),
                    saved,
                );
                return Response.json(saved, {status: 201});
            }
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

/** Body des ersten POST an die API */
const postedBody = (fetchMock: ReturnType<typeof mockApi>) => {
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    return JSON.parse(String(post?.[1]?.body));
};

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
    // Für das Select von Radix, jsdom kennt beides nicht
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
});

/** Die Tabelle im Abschnitt mit der Überschrift title */
const sectionOf = (title: string) => screen.getByRole("heading", {level: 2, name: title}).closest("section")!;

describe("Einstellungen", () => {
    it("zeigt „Allgemein“ und je Einstellung mit Historie eine eigene Tabelle", async () => {
        mockApi([value("a", "6", "2026-03-01")]);
        renderPage();

        await screen.findByText("6 Stunden");
        const headings = screen.getAllByRole("heading", {level: 2}).map((h) => h.textContent);
        expect(headings).toEqual(["Allgemein", "Soll", "Urlaubstage"]);

        const general = sectionOf("Allgemein");
        expect(within(general).getByText("show_action_bar")).toBeTruthy();
        expect(within(general).queryByRole("columnheader", {name: "Status"})).toBeNull();
        expect(within(general).queryByRole("columnheader", {name: "gültig ab"})).toBeNull();

        const soll = sectionOf("Soll");
        expect(within(soll).getByText("6 Stunden")).toBeTruthy();
        expect(within(soll).getByText("8 Stunden")).toBeTruthy();
        expect(within(soll).queryByText("30 Tage")).toBeNull();
        expect(within(soll).queryByRole("columnheader", {name: "Name"})).toBeNull();
        expect(screen.getAllByText(SETTINGS[0].description)).toHaveLength(1);

        expect(within(sectionOf("Urlaubstage")).getByText("30 Tage")).toBeTruthy();
    });

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
            expect(postedBody(fetchMock)).toEqual({
                settingId: SOLL_SETTING_ID,
                value: "6",
                validFrom: "2026-10-15",
            });
        });
    });

    it("setzt das Soll ab morgen auf den Default zurück", async () => {
        const fetchMock = mockApi([value("a", "6", "2026-03-01")]);
        renderPage();

        await screen.findByText("6 Stunden");
        fireEvent.click(within(rowOf("6 Stunden")).getByRole("button", {name: "Auf Default zurücksetzen"}));
        expect(((await screen.findByLabelText("gültig ab")) as HTMLInputElement).value).toBe("2026-10-15");
        expect(screen.queryByLabelText("Wert")).toBeNull(); // „Default“ hat keine Zahl
        fireEvent.click(screen.getByRole("button", {name: "Speichern"}));

        await waitFor(() => {
            expect(postedBody(fetchMock)).toEqual({
                settingId: SOLL_SETTING_ID,
                value: null,
                validFrom: "2026-10-15",
            });
        });
    });

    it("zeigt einen geplanten „Default“ mit dem aktuellen Default", async () => {
        mockApi([value("a", "6", "2026-03-01"), value("d", null, "2026-10-15")]);
        renderPage();

        const planned = (await screen.findByText("Default (8 Stunden)")).closest("tr")!;
        expect(within(planned).getByText("geplant")).toBeTruthy();
        expect(within(planned).getByText("15.10.2026")).toBeTruthy();
        expect(within(planned).getByRole("button", {name: "Löschen"})).toBeTruthy();
    });

    it("sperrt das Zurücksetzen, solange der Default gilt", async () => {
        mockApi([]);
        renderPage();

        await screen.findByText("8 Stunden");
        const button = within(rowOf("8 Stunden")).getByRole("button", {name: "Auf Default zurücksetzen"});
        expect(button.hasAttribute("disabled")).toBe(true);
    });
});

describe("Einstellung show_action_bar ohne Historie", () => {
    it("zeigt eine Zeile mit „Ja“, ohne Status und ohne gültig ab", async () => {
        mockApi([]);
        renderPage();

        const row = (await screen.findByText("show_action_bar")).closest("tr")!;
        expect(within(row).getByText("Ja")).toBeTruthy();
        expect(within(row).queryByText("aktuell")).toBeNull();
        expect(within(row).queryByText("–")).toBeNull();
        expect(within(row).getByRole("button", {name: "Auf Default zurücksetzen"}).hasAttribute("disabled")).toBe(true);
        expect(screen.getAllByText("show_action_bar")).toHaveLength(1);
    });

    it("ändert auf „Nein“ ohne gültig ab, die Zeile zeigt sofort „Nein“", async () => {
        const fetchMock = mockApi([]);
        renderPage();

        const row = (await screen.findByText("show_action_bar")).closest("tr")!;
        fireEvent.click(within(row).getByRole("button", {name: "Ändern"}));
        await screen.findByLabelText("Wert");
        expect(screen.queryByLabelText("gültig ab")).toBeNull();
        expect(screen.queryByLabelText("Art")).toBeNull();

        // Auswahl „Nein“ im Select von Radix
        fireEvent.click(screen.getByLabelText("Wert"));
        fireEvent.click(await screen.findByRole("option", {name: "Nein"}));
        fireEvent.click(screen.getByRole("button", {name: "Speichern"}));

        await waitFor(() => {
            expect(postedBody(fetchMock)).toEqual({
                settingId: SHOW_ACTION_BAR_SETTING_ID,
                value: "false",
            });
        });
        const updated = (await screen.findByText("Nein")).closest("tr")!;
        expect(within(updated).getByText("show_action_bar")).toBeTruthy();
        expect(screen.getAllByText("show_action_bar")).toHaveLength(1);
    });

    it("setzt sofort auf den Default zurück", async () => {
        const fetchMock = mockApi([actionBarValue("false")]);
        renderPage();

        const row = (await screen.findByText("Nein")).closest("tr")!;
        fireEvent.click(within(row).getByRole("button", {name: "Auf Default zurücksetzen"}));

        await screen.findByText("Default (Ja)");
        expect(postedBody(fetchMock)).toEqual({settingId: SHOW_ACTION_BAR_SETTING_ID, value: null});
    });
});
