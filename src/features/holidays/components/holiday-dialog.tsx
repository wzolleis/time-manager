import {type ReactElement, useId, useState} from "react";
import {Input} from "@/components/ui/input";
import {useAddHoliday} from "@features/holidays/use-cases/use-add-holiday";
import {useChangeHoliday} from "@features/holidays/use-cases/use-change-holiday";
import {localDay} from "@shared/time-rules";
import {isWeekend} from "@shared/week";
import {isValidDay} from "@shared/day-range";
import type {Holiday} from "@shared/holiday";
import {Muted} from "@/components/text/muted";
import {ErrorText} from "@/components/text/error-text";
import {FormDialog} from "@/components/form/form-dialog";
import {FormField} from "@/components/form/form-field";
import {FormRow} from "@/components/form/form-row";

type Props = {
    holiday?: Holiday; // mit Feiertag: bearbeiten, ohne: neu anlegen
    userId: string | null; // beim Anlegen: null = für alle
    userName?: string;
    trigger: ReactElement; // der Button, der den Dialog öffnet, z. B. ein EditButton in der Zeile
};

export function HolidayDialog({holiday, userId, userName, trigger}: Props) {
    const uid = useId();

    const [date, setDate] = useState("");
    const [name, setName] = useState("");

    // Beide Use Cases immer aufrufen (Hook-Regeln), verwendet wird der passende
    const add = useAddHoliday();
    const change = useChangeHoliday();
    const save = holiday ? change : add;

    const submit = (onClose: () => void) => {
        const close = {onSuccess: onClose};
        if (holiday) change.change({holiday, date, name}, close);
        else add.add({userId, date, name}, close);
    };

    // Beim Öffnen immer mit den gespeicherten Werten bzw. mit heute starten
    const reset = () => {
        setDate(holiday?.date ?? localDay(new Date()));
        setName(holiday?.name ?? "");
        save.reset();
    };

    const global = (holiday ? holiday.userId : userId) === null;
    const problem = save.problem(date, name);
    const weekend = !problem && isValidDay(date) && isWeekend(date);

    return (
        <FormDialog
            title={holiday ? "Feiertag bearbeiten" : "Feiertag eintragen"}
            description={
                <>
                    {global ? "Gilt für alle User." : `Gilt nur für ${userName ?? "diesen User"}.`} An einem Feiertag
                    ist das Soll 0, im Urlaub verbraucht er keinen Urlaubstag.
                </>
            }
            onOpen={reset}
            onSubmit={(close) => {
                submit(close);
            }}
            saving={save.isSaving}
            disabled={problem !== null}
            error={save.error}
            trigger={trigger}
        >
            <FormRow>
                <FormField label="Datum" htmlFor={`${uid}-date`}>
                    <Input
                        id={`${uid}-date`}
                        type="date"
                        value={date}
                        onChange={(e) => e.target.value && setDate(e.target.value)}
                        required
                    />
                </FormField>
                <FormField label="Name" htmlFor={`${uid}-name`}>
                    <Input
                        id={`${uid}-name`}
                        value={name}
                        maxLength={100}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </FormField>
            </FormRow>

            {problem && <ErrorText alert={false}>{problem}</ErrorText>}
            {weekend && <Muted>Der Tag fällt auf ein Wochenende und ändert das Soll nicht.</Muted>}
        </FormDialog>
    );
}
