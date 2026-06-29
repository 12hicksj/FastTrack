import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  roleId: serial("role_id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const users = pgTable("users", {
  userId: serial("user_id").primaryKey(),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.roleId),
  email: text("email").notNull().unique(),
  authProviderId: text("auth_provider_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
