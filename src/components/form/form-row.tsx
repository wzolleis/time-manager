import type {ReactNode} from "react";

/** Zwei Formularfelder nebeneinander, z. B. Datum und Uhrzeit */
export function FormRow({children}: {children: ReactNode}) {
    return <div className="grid grid-cols-2 gap-4">{children}</div>;
}
