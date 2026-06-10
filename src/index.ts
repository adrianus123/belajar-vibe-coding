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
  .get('/', () => ({ message: 'Welcome to Elysia + Drizzle + MySQL API!' }), {
    response: {
      200: t.Object({
        message: t.String({ default: 'Welcome to Elysia + Drizzle + MySQL API!' })
      })
    },
    detail: {
      summary: 'Pesan Selamat Datang',
      tags: ['General']
    }
  })
  .get('/users', async () => {
    try {
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt
      }).from(users);
      return { success: true, data: allUsers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, {
    response: {
      200: t.Object({
        success: t.Boolean({ default: true }),
        data: t.Optional(t.Array(t.Object({
          id: t.Number({ default: 1 }),
          name: t.String({ default: 'John Doe' }),
          email: t.String({ default: 'john@example.com' }),
          createdAt: t.Any({ default: '2026-06-10T02:40:00.000Z' })
        }))),
        error: t.Optional(t.String({ default: 'Error message' }))
      })
    },
    detail: {
      summary: 'Dapatkan Semua Pengguna (Tanpa Sesi)',
      tags: ['General']
    }
  });

if (process.env.NODE_ENV !== 'test') {
  app.listen(3000);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}
