import { Elysia, t } from 'elysia';
import { db } from './db/db';
import { users } from './db/schema';

const app = new Elysia()
  .get('/', () => ({ message: 'Welcome to Elysia + Drizzle + MySQL API!' }))
  .get('/users', async () => {
    try {
      const allUsers = await db.select().from(users);
      return { success: true, data: allUsers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
  .post('/users', async ({ body }) => {
    try {
      await db.insert(users).values({
        name: body.name,
        email: body.email,
      });
      return { success: true, message: 'User created successfully' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, {
    body: t.Object({
      name: t.String(),
      email: t.String({ format: 'email' }),
    })
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
