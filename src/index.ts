import { Elysia, t } from 'elysia';
import { db } from './db/db';
import { users } from './db/schema';
import { usersRoute } from './routes/users-route';

const app = new Elysia()
  .use(usersRoute)
  .get('/', () => ({ message: 'Welcome to Elysia + Drizzle + MySQL API!' }))
  .get('/users', async () => {
    try {
      const allUsers = await db.select().from(users);
      return { success: true, data: allUsers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
