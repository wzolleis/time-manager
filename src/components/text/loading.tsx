import {Muted} from "@/components/text/muted";

/** Hinweis, solange Daten geladen werden */
export function Loading({text = "Lade…", className}: {text?: string; className?: string}) {
    return <Muted className={className}>{text}</Muted>;
}
