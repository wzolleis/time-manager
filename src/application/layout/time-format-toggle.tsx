import {cn} from "cn";
import {Badge} from "@/components/ui/badge";
import {useIndustrialTime} from "@/lib/use-time-format";

// Zeigt im Kopf, wie die Dauern gerade angezeigt werden. Ein Klick schaltet um.
export const TimeFormatToggle = () => {
    const [industrialTime, setIndustrialTime] = useIndustrialTime();
    return (
        <Badge
            asChild
            variant="secondary"
            className={cn("h-6 cursor-pointer rounded-md", industrialTime && "bg-amber-100 text-amber-800")}
        >
            <button
                type="button"
                title={industrialTime ? "Umschalten auf Stunden und Minuten" : "Umschalten auf Industriezeit (8,50 h)"}
                onClick={() => setIndustrialTime(!industrialTime)}
            >
                {industrialTime ? "Industriezeit" : "60 min/h"}
            </button>
        </Badge>
    );
};
