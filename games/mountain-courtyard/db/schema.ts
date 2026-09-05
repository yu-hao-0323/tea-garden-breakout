import {integer,sqliteTable,text,index} from "drizzle-orm/sqlite-core";
export const accounts=sqliteTable("accounts",{
 id:text("id").primaryKey(),username:text("username").notNull().unique(),name:text("name").notNull(),passwordHash:text("password_hash").notNull(),recoveryHash:text("recovery_hash").notNull(),createdAt:integer("created_at").notNull()
});
export const saves=sqliteTable("game_saves",{
 userId:text("user_id").primaryKey().references(()=>accounts.id),state:text("state").notNull(),revision:integer("revision").notNull().default(0),updatedAt:integer("updated_at").notNull()
});
export const sessions=sqliteTable("sessions",{
 tokenHash:text("token_hash").primaryKey(),userId:text("user_id").notNull().references(()=>accounts.id),expiresAt:integer("expires_at").notNull()
},t=>[index("idx_sessions_user").on(t.userId),index("idx_sessions_expiry").on(t.expiresAt)]);
export const authLimits=sqliteTable("auth_limits",{scope:text("scope").primaryKey(),count:integer("count").notNull().default(0),resetAt:integer("reset_at").notNull()});
