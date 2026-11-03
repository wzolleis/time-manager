import {type ReactElement, useState} from "react";
import {Muted} from "@/components/text/muted";
import {localDay} from "@shared/time-rules";
import {dayCount} from "@shared/vacation-rules";
import {toDayRange} from "@shared/day-range";
import type {Vacation} from "@shared/vacation";
import {useAddVacation} from "@features/vacations/use-cases/use-add-vacation";
import {useChangeVacation} from "@features/vacations/use-cases/use-change-vacation";
import {ErrorText} from "@/components/text/error-text";
import {FormDialog} from "@/components/form/form-dialog";
import {DateRangeFields} from "@/components/form/date-range-fields";

type Props = {
    vacation?: Vacation; // mit Urlaub: bearbeiten, ohne: neu anlegen
    trigger: ReactElement; // der Button, der den Dialog öffnet, z. B. ein EditButton in der Zeile, ohne eigenes disabled
};

export function VacationDialog({vacation, trigger}: Props) {
    const add = useAddVacation();
    const change = useChangeVacation();
    const save = vacation ? change : add;
    const {currentUser} = save;

    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    const submit = (onClose: () => void) => {
        const close = {onSuccess: onClose};
        if (vacation) change.change({vacation, startDate: start, endDate: end}, close);
        else add.add({startDate: start, endDate: end}, close);
    };

    // Beim Öffnen immer mit den gespeicherten Werten bzw. mit heute starten
    const reset = () => {
        const today = localDay(new Date());
        setStart(vacation?.startDate ?? today);
        setEnd(vacation?.endDate ?? today);
        save.reset();
    };

    const range = {startDate: start, endDate: end};
    const days = toDayRange(range); // null, solange ein Tag fehlt oder ungültig ist
    const problem =
        !start || !end
            ? "Bitte Beginn und Ende wählen"
            : vacation
              ? change.problem({vacation, ...range})
              : add.problem(range);

    return (
        <FormDialog
            title={vacation ? "Urlaub bearbeiten" : "Urlaub eintragen"}
            description={
                <>
                    Für {currentUser?.name}. Das Ende ist eingeschlossen. Wochenenden und Feiertage zählen als
                    Kalendertage, aber nicht als Urlaubstage.
                </>
            }
            onOpen={reset}
            onSubmit={(close) => {
                if (!problem) submit(close);
            }}
            saving={save.isSaving}
            disabled={problem !== null}
            error={save.error}
            trigger={trigger}
            triggerDisabled={!currentUser}
        >
            <DateRangeFields
                start={start}
                end={end}
                onChange={(s, e) => {
                    setStart(s);
                    setEnd(e);
                }}
            />

            {problem ? (
                <ErrorText alert={false}>{problem}</ErrorText>
            ) : (
                <Muted>{`${days ? dayCount(days.startDate, days.endDate) : 0} Kalendertage · ${save.workdays(range)} Urlaubstage`}</Muted>
            )}
        </FormDialog>
    );
}
