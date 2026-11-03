import type {ReactNode} from "react";
import type {LinkProps} from "@tanstack/react-router";
import {TextLink} from "@/components/text/text-link";
import {ErrorText} from "@/components/text/error-text";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

type ReportInvalidPeriodProps = {
    title: string; // Titel des Berichts
    message: ReactNode; // was an der Adresse falsch ist
    to: LinkProps["to"]; // der Bericht ohne Angabe, also für den aktuellen Zeitraum
    linkLabel: string;
};

/** Seite für einen Bericht, dessen Zeitraum in der Adresse ungültig ist, mit Link zum aktuellen Zeitraum */
export function ReportInvalidPeriod({title, message, to, linkLabel}: ReportInvalidPeriodProps) {
    return (
        <Page>
            <PageHeader title={title} />
            <ErrorText>{message}</ErrorText>
            <TextLink to={to} className="text-sm">
                {linkLabel}
            </TextLink>
        </Page>
    );
}
