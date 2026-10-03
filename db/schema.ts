// db/schema.ts
import {char, datetime, index, mysqlEnum, mysqlTable, varchar} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
    id: char("id", {length: 36}).primaryKey(),
    name: varchar("name", {length: 100}).notNull(),
    email: varchar("email", {length: 191}).notNull().unique(),
    avatarUrl: varchar("avatar_url", {length: 2048}).default(""),
});

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