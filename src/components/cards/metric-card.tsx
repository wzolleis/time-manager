import {Card, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {cn} from "@/lib/utils";

/** Karte mit einer Kennzahl, z. B. Arbeitszeit oder Urlaubstage */
export function MetricCard({
    title,
    value,
    hint,
    valueClassName,
}: {
    title: string;
    value: string;
    hint?: string;
    valueClassName?: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardDescription>{title}</CardDescription>
                <CardTitle className={cn("text-2xl", valueClassName)}>{value}</CardTitle>
                {hint && <CardDescription>{hint}</CardDescription>}
            </CardHeader>
        </Card>
    );
}
