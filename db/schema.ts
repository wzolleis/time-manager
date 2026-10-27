// db/schema.ts
import {
    boolean,
    char,
    date,
    datetime,
    index,
    int,
    mysqlEnum,
    mysqlTable,
    primaryKey,
    text,
    uniqueIndex,
    varchar,
} from "drizzle-orm/mysql-core";

export const vacations = mysqlTable(
    "vacations",
    {
        id: char("id", {length: 36}).primaryKey(),
        userId: char("user_id", {length: 36})
            .notNull()
            .references(() => users.id),
        startDate: date("start_date", {mode: "string"}).notNull(),
        endDate: date("end_date", {mode: "string"}).notNull(), // inklusive
    },
    (t) => [index("idx_vacations_user_start").on(t.userId, t.startDate)],
);

// Krankmeldungen: Zeiträume ganzer Tage wie ein Urlaub. Buchungen an Krankheitstagen bleiben gespeichert.
export const sickLeaves = mysqlTable(
    "sick_leaves",
    {
        id: char("id", {length: 36}).primaryKey(),
        userId: char("user_id", {length: 36})
            .notNull()
            .references(() => users.id),
        startDate: date("start_date", {mode: "string"}).notNull(),
        endDate: date("end_date", {mode: "string"}).notNull(), // inklusive
        note: varchar("note", {length: 500}),
    },
    (t) => [index("idx_sick_leaves_user_start").on(t.userId, t.startDate)],
);

// Korrektur der Überstunden: höchstens ein Eintrag je User, eine neue Korrektur überschreibt ihn.
// Der Saldo wird nicht gespeichert, sondern ab dem Tag der Korrektur aus den Buchungen berechnet.
export const overtime = mysqlTable("overtime", {
    userId: char("user_id", {length: 36})
        .primaryKey()
        .references(() => users.id, {onDelete: "cascade"}), // ohne eigenen Endpoint zum Löschen
    offset: int("offset").notNull(), // Minuten, negativ: Fehlzeit
    created: datetime("created", {mode: "date", fsp: 0}).notNull(), // wann die Korrektur eingetragen wurde
});

// Einstellungen, die ein User anpassen kann. Fest vorgegeben (Migration 0014), ihre IDs stehen in
// shared/user-setting.ts. Der User legt keine neuen Einstellungen an, sondern nur Werte.
export const userSettings = mysqlTable("user_settings", {
    id: char("id", {length: 36}).primaryKey(),
    name: varchar("name", {length: 50}).notNull().unique(),
    description: varchar("description", {length: 500}).notNull(),
    type: mysqlEnum("type", ["number", "string"]).notNull(),
    unit: mysqlEnum("unit", ["hour", "day"]),
    defaultValue: varchar("default_value", {length: 100}).notNull(), // gilt, solange der User keinen Wert hat
    validFromUnit: mysqlEnum("valid_from_unit", ["day", "year"]).notNull(), // year: gültig ab einem 1. Januar
});

// Werte eines Users zu einer Einstellung. Jeder Wert gilt ab valid_from bis zum Tag vor dem nächsten Wert.
export const userSettingValues = mysqlTable(
    "user_setting_values",
    {
        id: char("id", {length: 36}).primaryKey(),
        userId: char("user_id", {length: 36})
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),
        settingId: char("setting_id", {length: 36})
            .notNull()
            .references(() => userSettings.id),
        value: varchar("value", {length: 100}).notNull(), // als String, ausgewertet nach user_settings.type
        validFrom: date("valid_from", {mode: "string"}).notNull(),
    },
    (t) => [uniqueIndex("uq_user_setting_values").on(t.userId, t.settingId, t.validFrom)],
);

// Feiertage: ohne user_id gelten sie für alle, mit user_id nur für diesen User
export const holidays = mysqlTable(
    "holidays",
    {
        id: char("id", {length: 36}).primaryKey(),
        userId: char("user_id", {length: 36}).references(() => users.id),
        date: date("date", {mode: "string"}).notNull(),
        name: varchar("name", {length: 100}).notNull(),
    },
    (t) => [index("idx_holidays_date").on(t.date), index("idx_holidays_user_date").on(t.userId, t.date)],
);

export const users = mysqlTable("users", {
    id: char("id", {length: 36}).primaryKey(),
    name: varchar("name", {length: 100}).notNull(),
    email: varchar("email", {length: 191}).notNull().unique(),
    avatarUrl: varchar("avatar_url", {length: 2048}).default(""),
    // bcrypt-Hash (immer 60 Zeichen). Ohne Hash ist keine Anmeldung möglich, bis der Admin ein Passwort setzt.
    passwordHash: char("password_hash", {length: 60}),
});

// Angemeldete Sessions. Gespeichert wird nur der SHA-256-Hash der Session-ID, die ID selbst steht nur im Cookie.
export const sessions = mysqlTable(
    "sessions",
    {
        idHash: char("id_hash", {length: 64}).primaryKey(),
        userId: char("user_id", {length: 36})
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),
        expiresAt: datetime("expires_at", {mode: "date", fsp: 0}).notNull(),
    },
    (t) => [index("idx_sessions_user").on(t.userId), index("idx_sessions_expires").on(t.expiresAt)],
);

// Agent-Tokens für /api/mcp. Gespeichert wird nur der SHA-256-Hash, das Token selbst sieht der User einmal.
export const apiTokens = mysqlTable(
    "api_tokens",
    {
        id: char("id", {length: 36}).primaryKey(),
        userId: char("user_id", {length: 36})
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),
        name: varchar("name", {length: 100}).notNull(),
        tokenHash: char("token_hash", {length: 64}).notNull().unique(),
        createdAt: datetime("created_at", {mode: "date", fsp: 0}).notNull(),
        lastUsedAt: datetime("last_used_at", {mode: "date", fsp: 0}),
        expiresAt: datetime("expires_at", {mode: "date", fsp: 0}), // null: kein Ablauf
    },
    (t) => [index("idx_api_tokens_user").on(t.userId)],
);

// Passkeys (WebAuthn) zum Anmelden ohne Passwort. Gespeichert wird nur der öffentliche Schlüssel.
export const passkeys = mysqlTable(
    "passkeys",
    {
        id: char("id", {length: 36}).primaryKey(),
        userId: char("user_id", {length: 36})
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),
        name: varchar("name", {length: 100}).notNull(),
        // base64url, wie das Gerät die ID beim Anmelden schickt
        credentialId: varchar("credential_id", {length: 700}).notNull().unique(),
        publicKey: text("public_key").notNull(), // COSE-Schlüssel als base64url
        counter: int("counter", {unsigned: true}).notNull(),
        transports: varchar("transports", {length: 255}), // kommagetrennt, z. B. internal,hybrid
        backedUp: boolean("backed_up").notNull(),
        createdAt: datetime("created_at", {mode: "date", fsp: 0}).notNull(),
        lastUsedAt: datetime("last_used_at", {mode: "date", fsp: 0}),
    },
    (t) => [index("idx_passkeys_user").on(t.userId)],
);

// Ausgegebene Challenges zwischen Optionen und Prüfung, jede gilt nur einmal (siehe features/use-case/passkeys.md)
export const passkeyChallenges = mysqlTable(
    "passkey_challenges",
    {
        challenge: varchar("challenge", {length: 64}).primaryKey(),
        purpose: mysqlEnum("purpose", ["registration", "authentication"]).notNull(),
        // beim Eintragen der angemeldete User, beim Anmelden null
        userId: char("user_id", {length: 36}).references(() => users.id, {onDelete: "cascade"}),
        expiresAt: datetime("expires_at", {mode: "date", fsp: 0}).notNull(),
    },
    (t) => [index("idx_passkey_challenges_expires").on(t.expiresAt)],
);

// Rollen. "Administrator" und "User" sind fest vorgegeben, ihre IDs stehen in shared/role.ts.
export const roles = mysqlTable("roles", {
    id: char("id", {length: 36}).primaryKey(),
    name: varchar("name", {length: 50}).notNull().unique(),
});

// Zuordnung Benutzer -> Rolle (n:m)
export const userRoles = mysqlTable(
    "user_roles",
    {
        userId: char("user_id", {length: 36})
            .notNull()
            .references(() => users.id, {onDelete: "cascade"}),
        roleId: char("role_id", {length: 36})
            .notNull()
            .references(() => roles.id),
    },
    (t) => [primaryKey({columns: [t.userId, t.roleId]}), index("idx_user_roles_role").on(t.roleId)],
);

// Zuordnung Endpoint + Methode -> Rolle. Der Pfad ist das Muster aus config.path, z. B. /api/users/:id.
// Ohne Eintrag gilt die Rolle "User". Gepflegt wird die Tabelle über Migrationen.
export const endpointRoles = mysqlTable(
    "endpoint_roles",
    {
        path: varchar("path", {length: 191}).notNull(),
        method: mysqlEnum("method", ["GET", "POST", "PUT", "PATCH", "DELETE"]).notNull(),
        roleId: char("role_id", {length: 36})
            .notNull()
            .references(() => roles.id),
    },
    (t) => [primaryKey({columns: [t.path, t.method]})],
);

export const projects = mysqlTable("projects", {
    id: char("id", {length: 36}).primaryKey(),
    name: varchar("name", {length: 100}).notNull().unique(),
});

export const timeEntries = mysqlTable(
    "time_entries",
    {
        id: char("id", {length: 36}).primaryKey(),
        userId: char("user_id", {length: 36})
            .notNull()
            .references(() => users.id),
        type: mysqlEnum("type", ["kommen", "gehen"]).notNull(),
        bookedAt: datetime("booked_at", {mode: "date", fsp: 0}).notNull(),
    },
    (t) => [index("idx_time_entries_user_booked").on(t.userId, t.bookedAt)],
);

// Zuordnung Buchung → Projekt
export const timeEntryProjects = mysqlTable(
    "time_entry_projects",
    {
        timeEntryId: char("time_entry_id", {length: 36})
            .primaryKey() // pro Buchung höchstens ein Projekt
            .references(() => timeEntries.id, {onDelete: "cascade"}),
        projectId: char("project_id", {length: 36})
            .notNull()
            .references(() => projects.id, {onDelete: "cascade"}),
    },
    (t) => [index("idx_time_entry_projects_project").on(t.projectId)],
);
