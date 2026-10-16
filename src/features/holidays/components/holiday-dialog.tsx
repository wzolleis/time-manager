import {type ComponentProps, useId, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {createHoliday, updateHoliday} from "@/api/holidays.ts";
import {localDay} from "@shared/time-rules.ts";
import {isValidDay} from "@shared/vacation-rules.ts";
import {weekdayIndex} from "@shared/week.ts";
import type {Holiday, HolidayUpdate} from "@shared/holiday.ts";

type Props = {
    holiday?: Holiday; // mit Feiertag: bearbeiten, ohne: neu anlegen
    userId: string | null; // beim Anlegen: null = für alle
    userName?: string;
    label: string;
    variant?: ComponentProps<typeof Button>["variant"];
    size?: ComponentProps<typeof Button>["size"];
};

export function HolidayDialog({holiday, userId, userName, label, variant = "outline", size = "sm"}: Props) {
    const qc = useQueryClient();
    const uid = useId();

    const [open, setOpen] = useState(false);
    const [date, setDate] = useState("");
    const [name, setName] = useState("");

    const save = useMutation({
        mutationFn: async () => {
            if (holiday) {
                // Nur Geändertes senden
                const patch: HolidayUpdate = {};
                if (date !== holiday.date) patch.date = date;
                if (name.trim() !== holiday.name) patch.name = name;
                if (Object.keys(patch).length === 0) return;
                await updateHoliday(holiday.id, patch);
            } else {
                await createHoliday({userId, date, name});
            }
        },
        onSuccess: async () => {
            await qc.invalidateQueries({queryKey: ["holidays"]});
            setOpen(false);
        },
    });

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
    const problem = !isValidDay(date)
        ? "Bitte ein Datum wählen"
        : name.trim() === ""
            ? "Bitte einen Namen angeben"
            : null;
    const weekend = !problem && weekdayIndex(date) >= 5;

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
                        save.mutate();
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

                    {save.isError && (
                        <p role="alert" className="text-sm text-destructive">
                            {save.error.message}
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={save.isPending || problem !== null}>
                            {save.isPending ? "Speichere…" : "Speichern"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
