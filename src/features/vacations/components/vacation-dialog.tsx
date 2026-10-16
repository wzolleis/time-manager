import {type ComponentProps, useId, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
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
import {createVacation, updateVacation} from "@/api/vacations";
import {useHolidays} from "@/views/holidays";
import {useCurrentUser} from "@/lib/user-context";
import {localDay} from "@shared/time-rules";
import {checkRange, countWorkdays, dayCount} from "@shared/vacation-rules";
import type {Vacation, VacationUpdate} from "@shared/vacation";

type Props = {
    vacation?: Vacation; // mit Urlaub: bearbeiten, ohne: neu anlegen
    label: string;
    variant?: ComponentProps<typeof Button>["variant"];
    size?: ComponentProps<typeof Button>["size"];
};

export function VacationDialog({vacation, label, variant = "outline", size = "sm"}: Props) {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const uid = useId();
    const holidays = useHolidays(currentUser?.id);

    const [open, setOpen] = useState(false);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    const save = useMutation({
        mutationFn: async () => {
            if (vacation) {
                // Nur Geändertes senden
                const patch: VacationUpdate = {};
                if (start !== vacation.startDate) patch.startDate = start;
                if (end !== vacation.endDate) patch.endDate = end;
                if (Object.keys(patch).length === 0) return;
                await updateVacation(vacation.id, patch);
            } else {
                await createVacation({userId: currentUser!.id, startDate: start, endDate: end});
            }
        },
        onSuccess: async () => {
            await qc.invalidateQueries({queryKey: ["vacations"]});
            setOpen(false);
        },
    });

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

    const problem = start && end ? checkRange(start, end) : "Bitte Beginn und Ende wählen";

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
                        save.mutate();
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

                    <p className={problem ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                        {problem ??
                            `${dayCount(start, end)} Kalendertage · ${countWorkdays(start, end, holidays.data ?? [])} Urlaubstage`}
                    </p>

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
