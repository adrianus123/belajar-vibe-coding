import { db } from '../src/db/db';
import { users, sessions } from '../src/db/schema';

export async function clearDatabase() {
  // Clear sessions first to avoid foreign key constraint violations
  await db.delete(sessions);
  await db.delete(users);
}
