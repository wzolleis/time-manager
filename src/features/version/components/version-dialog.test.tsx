// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {VersionDialog} from "./version-dialog";

afterEach(() => {
    cleanup();
});

describe("VersionDialog", () => {
    it("zeigt Version und Commit mit Link auf GitHub", () => {
        render(<VersionDialog open onOpenChange={() => {}} />);

        expect(screen.getByText(__APP_VERSION__)).toBeTruthy();
        expect(__APP_VERSION__).toMatch(/^\d{4}-\d{2}-\d{2}(-dirty)?$/);
        const link = screen.getByRole("link", {name: __APP_COMMIT__});
        expect(link.getAttribute("href")).toBe(`https://github.com/wzolleis/time-manager/commit/${__APP_COMMIT__}`);
        expect(__APP_COMMIT__).toMatch(/^[0-9a-f]{7}$/);
    });

    it("schließt über den Button Schließen", () => {
        const onOpenChange = vi.fn();
        render(<VersionDialog open onOpenChange={onOpenChange} />);

        fireEvent.click(screen.getByRole("button", {name: "Schließen"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
