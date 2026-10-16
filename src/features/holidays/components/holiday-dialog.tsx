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
import {useAddHoliday} from "@features/holidays/use-cases/use-add-holiday";
import {useChangeHoliday} from "@features/holidays/use-cases/use-change-holiday";
import {localDay} from "@shared/time-rules";
import {isWeekend} from "@shared/week";
import type {Holiday} from "@shared/holiday";

type Props = {
    holiday?: Holiday; // mit Feiertag: bearbeiten, ohne: neu anlegen
    userId: string | null; // beim Anlegen: null = für alle
    userName?: string;
    label: string;
    variant?: ComponentProps<typeof Button>["variant"];
    size?: ComponentProps<typeof Button>["size"];
};

export function HolidayDialog({holiday, userId, userName, label, variant = "outline", size = "sm"}: Props) {
    const uid = useId();

    const [open, setOpen] = useState(false);
    const [date, setDate] = useState("");
    const [name, setName] = useState("");

    // Beide Use Cases immer aufrufen (Hook-Regeln), verwendet wird der passende
    const add = useAddHoliday();
    const change = useChangeHoliday();
    const save = holiday ? change : add;

    const submit = () => {
        const close = {onSuccess: () => setOpen(false)};
        if (holiday) change.change({holiday, date, name}, close);
        else add.add({userId, date, name}, close);
    };

    // Beim Öffnen immer mit den gespeicherten Werten bzw. mit heute starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setDate(holiday?.date ?? localDay(new Date()));
            setName(holiday?.name ?? "");
            save.reset();
        }
        setOpen(next);
    };

    const global = (holiday ? holiday.userId : userId) === null;
    const problem = save.problem(date, name);
    const weekend = !problem && isWeekend(date);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size}>
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        submit();
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>{holiday ? "Feiertag bearbeiten" : "Feiertag eintragen"}</DialogTitle>
                        <DialogDescription>
                            {global ? "Gilt für alle User." : `Gilt nur für ${userName ?? "diesen User"}.`} An einem
                            Feiertag ist das Soll 0, im Urlaub verbraucht er keinen Urlaubstag.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-date`}>Datum</Label>
                            <Input
                                id={`${uid}-date`}
                                type="date"
                                value={date}
                                onChange={(e) => e.target.value && setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor={`${uid}-name`}>Name</Label>
                            <Input
                                id={`${uid}-name`}
                                value={name}
                                maxLength={100}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {problem && <p className="text-sm text-destructive">{problem}</p>}
                    {weekend && (
                        <p className="text-sm text-muted-foreground">
                            Der Tag fällt auf ein Wochenende und ändert das Soll nicht.
                        </p>
                    )}

                    {save.error && (
                        <p role="alert" className="text-sm text-destructive">
                            {save.error.message}
                        </p>
                    )}

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
