import { Elysia, t } from 'elysia';
import { registerUser, loginUser } from '../services/users-service';

export const usersRoute = new Elysia({ prefix: '/api' })
  .post('/users', async ({ body, set }) => {
    try {
      await registerUser(body);
      set.status = 201;
      return { data: 'OK' };
    } catch (error: any) {
      if (error.message === 'Email sudah terdaftar') {
        set.status = 400;
        return { error: error.message };
      }
      set.status = 500;
      return { error: 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 })
    })
  })
  .post('/users/login', async ({ body, set }) => {
    try {
      const token = await loginUser(body);
      return { data: token };
    } catch (error: any) {
      if (error.message === 'Email atau password salah') {
        set.status = 401;
        return { error: error.message };
      }
      set.status = 500;
      return { error: 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 1 })
    })
  });
