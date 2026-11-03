import {type ReactElement, useId, useState} from "react";
import {Input} from "@/components/ui/input";
import type {SickLeave} from "@shared/sick-leave";
import {bookingsInRangeMessage} from "@shared/sick-leave-rules";
import {localDay} from "@shared/time-rules";
import {useAddSickLeave} from "@features/sick-leaves/use-cases/use-add-sick-leave";
import {useChangeSickLeave} from "@features/sick-leaves/use-cases/use-change-sick-leave";
import {Muted} from "@/components/text/muted";
import {ErrorText} from "@/components/text/error-text";
import {FormDialog} from "@/components/form/form-dialog";
import {DateRangeFields} from "@/components/form/date-range-fields";
import {FormField} from "@/components/form/form-field";

type Props = {
    sickLeave?: SickLeave; // mit Krankmeldung: bearbeiten, ohne: neu eintragen
    trigger: ReactElement; // der Button, der den Dialog öffnet, z. B. ein EditButton in der Zeile, ohne eigenes disabled
};

const dayLabel = (n: number) => (n === 1 ? "1 Krankheitstag" : `${n} Krankheitstage`);

export function SickLeaveDialog({sickLeave, trigger}: Props) {
    const uid = useId();
    const add = useAddSickLeave();
    const change = useChangeSickLeave();
    const save = sickLeave ? change : add;
    const {currentUser} = save;

    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [note, setNote] = useState("");

    const submit = (onClose: () => void) => {
        const close = {onSuccess: onClose};
        const data = {startDate: start, endDate: end, note: note.trim() || null};
        if (sickLeave) change.change({sickLeave, ...data}, close);
        else add.add(data, close);
    };

    // Beim Öffnen immer mit den gespeicherten Werten bzw. mit heute starten
    const reset = () => {
        const today = localDay(new Date());
        setStart(sickLeave?.startDate ?? today);
        setEnd(sickLeave?.endDate ?? today);
        setNote(sickLeave?.note ?? "");
        save.reset();
    };

    const range = {startDate: start, endDate: end};
    const problem =
        !start || !end
            ? "Bitte Beginn und Ende wählen"
            : sickLeave
              ? change.problem({sickLeave, ...range})
              : add.problem(range);
    const entries = problem ? 0 : save.entriesInRange(range);

    return (
        <FormDialog
            title={sickLeave ? "Krankmeldung bearbeiten" : "Krankmeldung eintragen"}
            description={
                <>
                    Für {currentUser?.name}. Das Ende ist eingeschlossen. Krankheitstage haben kein Soll, Wochenenden
                    und Feiertage zählen nicht als Krankheitstage.
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

            <FormField label="Notiz" htmlFor={`${uid}-note`}>
                <Input
                    id={`${uid}-note`}
                    value={note}
                    maxLength={500}
                    placeholder="z. B. Attest liegt vor"
                    onChange={(e) => setNote(e.target.value)}
                />
            </FormField>

            {problem ? <ErrorText alert={false}>{problem}</ErrorText> : <Muted>{dayLabel(save.sickDays(range))}</Muted>}
            {entries > 0 && <Muted>{bookingsInRangeMessage(entries)}</Muted>}
        </FormDialog>
    );
}
