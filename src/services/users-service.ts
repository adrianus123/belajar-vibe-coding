import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { users } from '../db/schema';

export async function registerUser(data: any) {
  const existingUser = await db.select().from(users).where(eq(users.email, data.email));
  if (existingUser.length > 0) {
    throw new Error('Email sudah terdaftar');
  }

  const passwordHash = await Bun.password.hash(data.password, {
    algorithm: "bcrypt",
    cost: 10
  });

  await db.insert(users).values({
    name: data.name,
    email: data.email,
    password: passwordHash,
  });
}
