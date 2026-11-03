import {useId} from "react";
import {Input} from "@/components/ui/input";
import {FormField} from "@/components/form/form-field";
import {FormRow} from "@/components/form/form-row";

type Props = {
    start: string; // "JJJJ-MM-TT", leer solange nichts gewählt ist
    end: string;
    onChange: (start: string, end: string) => void;
};

/** Beginn und Ende eines Zeitraums nebeneinander. Das Ende kann nicht vor dem Beginn liegen. */
export function DateRangeFields({start, end, onChange}: Props) {
    const uid = useId();

    const onStartChange = (value: string) => {
        if (!value) return;
        onChange(value, end < value ? value : end); // das Ende zieht mit, wenn es sonst davor läge
    };

    return (
        <FormRow>
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
                    onChange={(e) => e.target.value && onChange(start, e.target.value)}
                    required
                />
            </FormField>
        </FormRow>
    );
}
