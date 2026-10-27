import {type ComponentProps, useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import type {SickLeave} from "@shared/sick-leave";
import {bookingsInRangeMessage} from "@shared/sick-leave-rules";
import {localDay} from "@shared/time-rules";
import {useAddSickLeave} from "@features/sick-leaves/use-cases/use-add-sick-leave";
import {useChangeSickLeave} from "@features/sick-leaves/use-cases/use-change-sick-leave";
import {Muted} from "@/components/text/muted";
import {ErrorText} from "@/components/text/error-text";

type Props = {
    sickLeave?: SickLeave; // mit Krankmeldung: bearbeiten, ohne: neu eintragen
    label: string;
    variant?: ComponentProps<typeof Button>["variant"];
    size?: ComponentProps<typeof Button>["size"];
};

const dayLabel = (n: number) => (n === 1 ? "1 Krankheitstag" : `${n} Krankheitstage`);

export function SickLeaveDialog({sickLeave, label, variant = "outline", size = "sm"}: Props) {
    const uid = useId();
    const add = useAddSickLeave();
    const change = useChangeSickLeave();
    const save = sickLeave ? change : add;
    const {currentUser} = save;

    const [open, setOpen] = useState(false);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [note, setNote] = useState("");

    const submit = () => {
        const close = {onSuccess: () => setOpen(false)};
        const data = {startDate: start, endDate: end, note: note.trim() || null};
        if (sickLeave) change.change({sickLeave, ...data}, close);
        else add.add(data, close);
    };

    // Beim Öffnen immer mit den gespeicherten Werten bzw. mit heute starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            const today = localDay(new Date());
            setStart(sickLeave?.startDate ?? today);
            setEnd(sickLeave?.endDate ?? today);
            setNote(sickLeave?.note ?? "");
            save.reset();
        }
        setOpen(next);
    };

    const onStartChange = (value: string) => {
        if (!value) return;
        setStart(value);
        if (end < value) setEnd(value); // das Ende zieht mit, wenn es sonst davor läge
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} disabled={!currentUser}>
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!problem) submit();
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>{sickLeave ? "Krankmeldung bearbeiten" : "Krankmeldung eintragen"}</DialogTitle>
                        <DialogDescription>
                            Für {currentUser?.name}. Das Ende ist eingeschlossen. Krankheitstage haben kein Soll,
                            Wochenenden und Feiertage zählen nicht als Krankheitstage.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-start`}>Beginn</Label>
                            <Input
                                id={`${uid}-start`}
                                type="date"
                                value={start}
                                onChange={(e) => onStartChange(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-end`}>Ende</Label>
                            <Input
                                id={`${uid}-end`}
                                type="date"
                                value={end}
                                min={start || undefined}
                                onChange={(e) => e.target.value && setEnd(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 text-left">
                        <Label htmlFor={`${uid}-note`}>Notiz</Label>
                        <Input
                            id={`${uid}-note`}
                            value={note}
                            maxLength={500}
                            placeholder="z. B. Attest liegt vor"
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    {problem ? (
                        <ErrorText alert={false}>{problem}</ErrorText>
                    ) : (
                        <Muted>{dayLabel(save.sickDays(range))}</Muted>
                    )}
                    {entries > 0 && <Muted>{bookingsInRangeMessage(entries)}</Muted>}

                    {save.error && <ErrorText>{save.error.message}</ErrorText>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={save.isSaving || problem !== null}>
                            {save.isSaving ? "Speichere…" : "Speichern"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
