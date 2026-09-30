// db/schema.ts
import {char, mysqlTable, varchar} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
    id: char("id", {length: 36}).primaryKey(),
    name: varchar("name", {length: 100}).notNull(),
    email: varchar("email", {length: 191}).notNull().unique(),
    avatarUrl: varchar("avatar_url", {length: 2048}).default(""),
});