import {type ComponentProps, useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {Muted} from "@/components/text/muted";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {localDay} from "@shared/time-rules";
import {dayCount} from "@shared/vacation-rules";
import type {Vacation} from "@shared/vacation";
import {useAddVacation} from "@features/vacations/use-cases/use-add-vacation";
import {useChangeVacation} from "@features/vacations/use-cases/use-change-vacation";
import {ErrorText} from "@/components/text/error-text";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";
import {FormField} from "@/components/form/form-field";

type Props = {
    vacation?: Vacation; // mit Urlaub: bearbeiten, ohne: neu anlegen
    label: string;
    variant?: ComponentProps<typeof Button>["variant"];
    size?: ComponentProps<typeof Button>["size"];
};

export function VacationDialog({vacation, label, variant = "outline", size = "sm"}: Props) {
    const uid = useId();
    const add = useAddVacation();
    const change = useChangeVacation();
    const save = vacation ? change : add;
    const {currentUser} = save;

    const [open, setOpen] = useState(false);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    const submit = () => {
        const close = {onSuccess: () => setOpen(false)};
        if (vacation) change.change({vacation, startDate: start, endDate: end}, close);
        else add.add({startDate: start, endDate: end}, close);
    };

    // Beim Öffnen immer mit den gespeicherten Werten bzw. mit heute starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            const today = localDay(new Date());
            setStart(vacation?.startDate ?? today);
            setEnd(vacation?.endDate ?? today);
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
            : vacation
              ? change.problem({vacation, ...range})
              : add.problem(range);

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
                        <DialogTitle>{vacation ? "Urlaub bearbeiten" : "Urlaub eintragen"}</DialogTitle>
                        <DialogDescription>
                            Für {currentUser?.name}. Das Ende ist eingeschlossen. Wochenenden und Feiertage zählen als
                            Kalendertage, aber nicht als Urlaubstage.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Beginn" htmlFor={`${uid}-start`}>
                            <Input
                                id={`${uid}-start`}
                                type="date"
                                value={start}
                                onChange={(e) => onStartChange(e.target.value)}
                                required
                            />
                        </FormField>
                        <FormField label="Ende" htmlFor={`${uid}-end`}>
                            <Input
                                id={`${uid}-end`}
                                type="date"
                                value={end}
                                min={start || undefined}
                                onChange={(e) => e.target.value && setEnd(e.target.value)}
                                required
                            />
                        </FormField>
                    </div>

                    {problem ? (
                        <ErrorText alert={false}>{problem}</ErrorText>
                    ) : (
                        <Muted>{`${dayCount(start, end)} Kalendertage · ${save.workdays(range)} Urlaubstage`}</Muted>
                    )}

                    {save.error && <ErrorText>{save.error.message}</ErrorText>}

                    <FormDialogFooter
                        onCancel={() => setOpen(false)}
                        saving={save.isSaving}
                        disabled={problem !== null}
                    />
                </form>
            </DialogContent>
        </Dialog>
    );
}
