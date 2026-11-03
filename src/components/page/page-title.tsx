import type {ReactNode} from "react";

/** Überschrift einer Seite (h1) */
export function PageTitle({children}: {children: ReactNode}) {
    return <h1 className="text-2xl font-semibold">{children}</h1>;
}
