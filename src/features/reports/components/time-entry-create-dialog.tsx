import {type ComponentProps, useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {formatDuration, formatTime} from "@shared/format";
import {useProjects} from "@/views/projects";
import {localDay, WORK_DAY_MINUTES, WORK_DAY_START} from "@shared/time-rules";
import {useAddTimeEntry} from "@features/reports/use-cases/use-add-time-entry";
import {useAddTimeEntryDay} from "@features/reports/use-cases/use-add-time-entry-day";
import {Muted} from "@/components/text/muted";
import {ErrorText} from "@/components/text/error-text";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";
import {FormField} from "@/components/form/form-field";

type EntryType = "kommen" | "gehen";
type Mode = "stamp" | "day"; // ein Zeitstempel oder ein Zeitraum (ganzer Tag oder Arbeitszeit nach den Buchungen)

type Props = {
    defaultDay: string; // "JJJJ-MM-TT"
    defaultType: EntryType;
    defaultTime?: string; // "HH:mm"; ohne Angabe: jetzt für heute, sonst leer
    label: string;
    variant?: ComponentProps<typeof Button>["variant"];
    size?: ComponentProps<typeof Button>["size"];
};

const NO_PROJECT = "none"; // Radix Select erlaubt keinen leeren String als Wert

/** Minuten als "HH:mm", für das Feld der Arbeitszeit */
const toHhmm = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const DAY_WORK_TIME = toHhmm(WORK_DAY_MINUTES);

/** "HH:mm" als Minuten, leer ergibt 0 */
const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return hhmm ? h * 60 + m : 0;
};

export function TimeEntryCreateDialog({
    defaultDay,
    defaultType,
    defaultTime,
    label,
    variant = "outline",
    size = "sm",
}: Props) {
    const uid = useId();
    const projects = useProjects();
    const create = useAddTimeEntry();
    const createDay = useAddTimeEntryDay();
    const {currentUser} = create;

    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("stamp");
    const [day, setDay] = useState(defaultDay);
    const [time, setTime] = useState("");
    const [type, setType] = useState<EntryType>(defaultType);
    const [projectChoice, setProjectChoice] = useState(NO_PROJECT);
    const [start, setStart] = useState(WORK_DAY_START);
    const [workTime, setWorkTime] = useState(DAY_WORK_TIME); // Arbeitszeit als "HH:mm"

    // Beim Öffnen immer mit den Vorgaben starten, keine alten Eingaben oder Fehler
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setMode("stamp");
            setDay(defaultDay);
            setType(defaultType);
            setTime(defaultTime ?? (defaultDay === localDay(new Date()) ? formatTime(new Date()) : ""));
            setProjectChoice(NO_PROJECT);
            setStart(WORK_DAY_START);
            setWorkTime(DAY_WORK_TIME);
            create.reset();
            createDay.reset();
        }
        setOpen(next);
    };

    // Vorgaben für einen Zeitraum: am leeren Tag 08:00 und 8 h, an einem Tag mit Buchungen keine
    const applyDayDefaults = (d: string) => {
        const busy = createDay.hasBookings(d);
        setStart(busy ? "" : WORK_DAY_START);
        setWorkTime(busy ? "" : DAY_WORK_TIME);
    };
    const changeMode = (next: Mode) => {
        if (next === "day") applyDayDefaults(day);
        setMode(next);
    };
    const changeDay = (next: string) => {
        if (mode === "day") applyDayDefaults(next);
        setDay(next);
    };

    const workDay = {day, start: start || undefined, workMinutes: toMinutes(workTime)};
    const problem = mode === "stamp" ? create.problem({type, day, time}) : createDay.problem(workDay);
    const {bookings: preview, pauseMinutes} =
        mode === "day" && !problem ? createDay.preview(workDay) : {bookings: [], pauseMinutes: 0};
    const earliest = mode === "day" && !start ? createDay.earliestStart(day, workDay.workMinutes) : null;
    const sickNotice = create.sickNotice(day);
    const saving = mode === "stamp" ? create.isSaving : createDay.isSaving;
    const error = mode === "stamp" ? create.error : createDay.error;
    const projectId = projectChoice === NO_PROJECT ? null : projectChoice;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || problem) return;
        const onSuccess = () => setOpen(false);
        if (mode === "stamp") create.add({type, day, time, projectId}, {onSuccess});
        else createDay.add({...workDay, projectId}, {onSuccess});
    };

    const projectField = (
        <FormField label="Projekt" htmlFor={`${uid}-project`}>
            <Select value={projectChoice} onValueChange={setProjectChoice}>
                <SelectTrigger id={`${uid}-project`}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NO_PROJECT}>Kein Projekt</SelectItem>
                    {projects.data?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                            {p.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>
    );

    const dayField = (
        <FormField label="Tag" htmlFor={`${uid}-day`}>
            <Input
                id={`${uid}-day`}
                type="date"
                value={day}
                max={localDay(new Date())}
                onChange={(e) => e.target.value && changeDay(e.target.value)}
                required
            />
        </FormField>
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} disabled={!currentUser}>
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Buchung nachtragen</DialogTitle>
                        <DialogDescription>
                            Für {currentUser?.name}. Kommen und Gehen müssen am selben Tag liegen, die Abfolge wird beim
                            Speichern geprüft. Bei einem Zeitraum wird die nötige Pause eingeplant.
                        </DialogDescription>
                    </DialogHeader>

                    <FormField label="Nachtragen" htmlFor={`${uid}-mode`}>
                        <Select value={mode} onValueChange={(v) => changeMode(v as Mode)}>
                            <SelectTrigger id={`${uid}-mode`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="stamp">Zeitstempel</SelectItem>
                                <SelectItem value="day">Zeitraum</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>

                    {mode === "stamp" ? (
                        <>
                            <FormField label="Buchung" htmlFor={`${uid}-type`}>
                                <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
                                    <SelectTrigger id={`${uid}-type`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kommen">Kommen</SelectItem>
                                        <SelectItem value="gehen">Gehen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                {dayField}
                                <FormField label="Uhrzeit" htmlFor={`${uid}-time`}>
                                    <Input
                                        id={`${uid}-time`}
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        required
                                    />
                                </FormField>
                            </div>

                            {type === "kommen" && projectField}
                        </>
                    ) : (
                        <>
                            {dayField}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Beginn" htmlFor={`${uid}-start`}>
                                    <Input
                                        id={`${uid}-start`}
                                        type="time"
                                        value={start}
                                        onChange={(e) => setStart(e.target.value)}
                                    />
                                </FormField>
                                <FormField label="Arbeitszeit" htmlFor={`${uid}-work`}>
                                    <Input
                                        id={`${uid}-work`}
                                        type="time"
                                        value={workTime}
                                        onChange={(e) => setWorkTime(e.target.value)}
                                        required
                                    />
                                </FormField>
                            </div>

                            {earliest && <Muted>Ohne Beginn so früh wie möglich, ab {formatTime(earliest)}.</Muted>}

                            {projectField}

                            {preview.length > 0 && (
                                <Muted>
                                    Buchungen:{" "}
                                    {pairs(preview)
                                        .map(([from, to]) => `${formatTime(from)}–${formatTime(to)}`)
                                        .join(", ")}
                                    {pauseMinutes > 0 && `, Pause ${formatDuration(pauseMinutes * 60_000)}`}
                                </Muted>
                            )}
                        </>
                    )}

                    {sickNotice && <Muted>{sickNotice}</Muted>}
                    {problem && <ErrorText alert={false}>{problem}</ErrorText>}
                    {error && <ErrorText>{error.message}</ErrorText>}

                    <FormDialogFooter onCancel={() => setOpen(false)} saving={saving} disabled={problem !== null} />
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Kommen und Gehen der Vorschau paarweise: [kommen, gehen][]
function pairs(bookings: {bookedAt: Date}[]): [Date, Date][] {
    const result: [Date, Date][] = [];
    for (let i = 0; i + 1 < bookings.length; i += 2) result.push([bookings[i].bookedAt, bookings[i + 1].bookedAt]);
    return result;
}
