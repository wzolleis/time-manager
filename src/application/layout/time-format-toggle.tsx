import {Badge} from "@radix-ui/themes";
import {useIndustrialTime} from "@/lib/use-time-format";

// Zeigt im Kopf, wie die Dauern gerade angezeigt werden. Ein Klick schaltet um.
export const TimeFormatToggle = () => {
    const [industrialTime, setIndustrialTime] = useIndustrialTime();
    return (
        <Badge asChild color={industrialTime ? "amber" : "gray"} size="2">
            <button
                type="button"
                className="cursor-pointer"
                title={industrialTime ? "Umschalten auf Stunden und Minuten" : "Umschalten auf Industriezeit (8,50 h)"}
                onClick={() => setIndustrialTime(!industrialTime)}
            >
                {industrialTime ? "Industriezeit" : "60 min/h"}
            </button>
        </Badge>
    );
};
