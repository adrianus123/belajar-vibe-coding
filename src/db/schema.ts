import { mysqlTable, serial, int, varchar, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = mysqlTable('sessions', {
  id: int('id').autoincrement().primaryKey(),
  token: varchar('token', { length: 255 }).notNull(),
  userId: int('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
