// shared/test-dates.ts
// Kurze Helfer für Tests: ein Text wird zum geprüften Tag, Monat, Jahr oder zur Uhrzeit (wirft bei ungültigem Text)
export {parseDay as day, parseMonth as month, parseTimeOfDay as time, parseYear as year} from "./date-schemas";
