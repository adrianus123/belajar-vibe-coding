import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { users, sessions } from '../db/schema';

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

export async function loginUser(data: any) {
  const result = await db.select().from(users).where(eq(users.email, data.email));
  if (result.length === 0) {
    throw new Error('Email atau password salah');
  }

  const user = result[0]!;

  const isPasswordValid = await Bun.password.verify(data.password, user.password);
  if (!isPasswordValid) {
    throw new Error('Email atau password salah');
  }

  const token = crypto.randomUUID();

  await db.insert(sessions).values({
    token: token,
    userId: user.id,
  });

  return token;
}

export async function getCurrentUser(token: string) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token));

  if (result.length === 0) {
    throw new Error('Unauthorized');
  }

  return result[0];
}

export async function logoutUser(token: string) {
  const result = await db.select().from(sessions).where(eq(sessions.token, token));
  if (result.length === 0) {
    throw new Error('Unauthorized');
  }

  await db.delete(sessions).where(eq(sessions.token, token));
}

