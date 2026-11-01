// netlify/functions/lib/errors.ts
// Fehler, die Stores und Functions werfen und die errorResponse (lib/http.ts) in eine Antwort umwandelt

/** Den Datensatz gibt es nicht, oder er gehört einem anderen User. Die Function antwortet mit notFound(). */
export class NotFoundError extends Error {}

/** Den User aus dem Pfad gibt es nicht. Die Function antwortet mit unknownUser(). */
export class UnknownUserError extends Error {}
