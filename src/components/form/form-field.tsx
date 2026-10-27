import type {ReactNode} from "react";
import {Label} from "@/components/ui/label";

type FormFieldProps = {
    label: ReactNode;
    htmlFor: string; // id des Eingabefelds, damit der Label-Klick es fokussiert
    children: ReactNode;
};

/** Beschriftetes Eingabefeld, linksbündig auch in zentrierten Dialogen */
export function FormField({label, htmlFor, children}: FormFieldProps) {
    return (
        <div className="space-y-2 text-left">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}
