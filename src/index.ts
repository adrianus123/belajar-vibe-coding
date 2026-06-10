import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { db } from './db/db';
import { users } from './db/schema';
import { usersRoute } from './routes/users-route';

export const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: 'Belajar Vibe Coding API',
        version: '1.0.0',
        description: 'Dokumentasi API interaktif untuk aplikasi Belajar Vibe Coding'
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer'
          }
        }
      }
    }
  }))
  .use(usersRoute)
  .get('/', () => ({ message: 'Welcome to Elysia + Drizzle + MySQL API!' }))
  .get('/users', async () => {
    try {
      const allUsers = await db.select().from(users);
      return { success: true, data: allUsers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

if (process.env.NODE_ENV !== 'test') {
  app.listen(3000);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}

