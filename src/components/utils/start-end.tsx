import type {PropsWithChildren} from "react";

export function StartEnd({children}: PropsWithChildren) {
    return <div className="flex w-full min-w-0 items-center justify-between gap-3 px-4">{children}</div>;
}
