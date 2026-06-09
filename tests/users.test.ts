import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { app } from '../src/index';
import { db, poolConnection } from '../src/db/db';
import { users, sessions } from '../src/db/schema';
import { clearDatabase } from './db-helper';
import { eq } from 'drizzle-orm';

describe('API Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await poolConnection.end();
  });

  // 1. Endpoint: GET /
  describe('GET /', () => {
    it('should return welcome message with status 200', async () => {
      const response = await app.handle(
        new Request('http://localhost/', {
          method: 'GET',
        })
      );
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body).toEqual({ message: 'Welcome to Elysia + Drizzle + MySQL API!' });
    });
  });

  // 2. Endpoint: GET /users
  describe('GET /users', () => {
    it('should return empty user list when database is empty', async () => {
      const response = await app.handle(
        new Request('http://localhost/users', {
          method: 'GET',
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeArray();
      expect(body.data.length).toBe(0);
    });

    it('should return all users in database', async () => {
      // Seed a user directly into database
      await db.insert(users).values({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
      });

      const response = await app.handle(
        new Request('http://localhost/users', {
          method: 'GET',
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Test User');
      expect(body.data[0].email).toBe('test@example.com');
    });

    it('should handle database errors and return success: false', async () => {
      const originalSelect = db.select;
      // Temporarily mock db.select to throw an error
      db.select = () => {
        throw new Error('Simulated database error');
      };

      try {
        const response = await app.handle(
          new Request('http://localhost/users', {
            method: 'GET',
          })
        );
        expect(response.status).toBe(200);
        
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe('Simulated database error');
      } finally {
        // Restore original select function
        db.select = originalSelect;
      }
    });
  });

  // 3. Endpoint: POST /api/users (Registration)
  describe('POST /api/users (Registration)', () => {
    it('should register a new user successfully with valid data', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
          }),
        })
      );
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body).toEqual({ data: 'OK' });

      // Verify user is in database
      const dbUsers = await db.select().from(users).where(eq(users.email, 'john@example.com'));
      expect(dbUsers.length).toBe(1);
      expect(dbUsers[0].name).toBe('John Doe');
      
      // Verify password hashing was applied
      const isHashValid = await Bun.password.verify('password123', dbUsers[0].password);
      expect(isHashValid).toBe(true);
    });

    it('should fail registration if email is already registered', async () => {
      // Register initial user
      await app.handle(
        new Request('http://localhost/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
          }),
        })
      );

      // Attempt registration with duplicate email
      const response = await app.handle(
        new Request('http://localhost/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Jane Doe',
            email: 'john@example.com',
            password: 'differentpassword',
          }),
        })
      );
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({ error: 'Email sudah terdaftar' });
    });

    it('should return 422 if email format is invalid or password is too short', async () => {
      // Invalid email
      const responseEmail = await app.handle(
        new Request('http://localhost/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'John Doe',
            email: 'notanemail',
            password: 'password123',
          }),
        })
      );
      expect(responseEmail.status).toBe(422);

      // Password too short (less than 6 characters)
      const responsePassword = await app.handle(
        new Request('http://localhost/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
            password: '12345',
          }),
        })
      );
      expect(responsePassword.status).toBe(422);
    });

    it('should return 422 if name exceeds 255 characters', async () => {
      const longName = 'a'.repeat(256);
      const response = await app.handle(
        new Request('http://localhost/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: longName,
            email: 'john@example.com',
            password: 'password123',
          }),
        })
      );
      expect(response.status).toBe(422);
    });
  });

  // 4. Endpoint: POST /api/users/login (Login)
  describe('POST /api/users/login (Login)', () => {
    beforeEach(async () => {
      // Create user to test login scenarios
      const passwordHash = await Bun.password.hash('password123', {
        algorithm: 'bcrypt',
        cost: 10,
      });
      await db.insert(users).values({
        name: 'John Doe',
        email: 'john@example.com',
        password: passwordHash,
      });
    });

    it('should login successfully with correct credentials and return a token', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'john@example.com',
            password: 'password123',
          }),
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data).toBeString();
      expect(body.data.length).toBeGreaterThan(0);

      // Verify session token is in the database
      const dbSessions = await db.select().from(sessions).where(eq(sessions.token, body.data));
      expect(dbSessions.length).toBe(1);
    });

    it('should fail login if email is not registered', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'unregistered@example.com',
            password: 'password123',
          }),
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({ error: 'Email atau password salah' });
    });

    it('should fail login if password is incorrect', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'john@example.com',
            password: 'wrongpassword',
          }),
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({ error: 'Email atau password salah' });
    });

    it('should return 422 if input validation fails (e.g., invalid email format)', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'not-an-email',
            password: 'password123',
          }),
        })
      );
      expect(response.status).toBe(422);
    });
  });

  // 5. Endpoint: GET /api/users/current (Get Current User)
  describe('GET /api/users/current (Get Current User)', () => {
    let token: string;
    let userId: number;

    beforeEach(async () => {
      // Register user
      const passwordHash = await Bun.password.hash('password123', {
        algorithm: 'bcrypt',
        cost: 10,
      });
      const [insertResult] = await db.insert(users).values({
        name: 'John Doe',
        email: 'john@example.com',
        password: passwordHash,
      });
      userId = insertResult.insertId;

      // Create valid session token
      token = crypto.randomUUID();
      await db.insert(sessions).values({
        token: token,
        userId: userId,
      });
    });

    it('should return current user details when a valid token is provided', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/current', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data.id).toBe(userId);
      expect(body.data.name).toBe('John Doe');
      expect(body.data.email).toBe('john@example.com');
      expect(body.data.password).toBeUndefined(); // Ensure password is excluded
      expect(body.data.created_at).toBeDefined();
    });

    it('should return 401 Unauthorized if Authorization header is missing', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/current', {
          method: 'GET',
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 Unauthorized if token is invalid', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/current', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer invalidtoken123',
          },
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });

  // 6. Endpoint: DELETE /api/users/logout (Logout)
  describe('DELETE /api/users/logout (Logout)', () => {
    let token: string;
    let userId: number;

    beforeEach(async () => {
      // Register user
      const passwordHash = await Bun.password.hash('password123', {
        algorithm: 'bcrypt',
        cost: 10,
      });
      const [insertResult] = await db.insert(users).values({
        name: 'John Doe',
        email: 'john@example.com',
        password: passwordHash,
      });
      userId = insertResult.insertId;

      // Create valid session token
      token = crypto.randomUUID();
      await db.insert(sessions).values({
        token: token,
        userId: userId,
      });
    });

    it('should logout successfully and delete the session from DB', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/logout', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ data: 'OK' });

      // Verify the session has been deleted from database
      const dbSessions = await db.select().from(sessions).where(eq(sessions.token, token));
      expect(dbSessions.length).toBe(0);
    });

    it('should return 401 Unauthorized if Authorization header is missing', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/logout', {
          method: 'DELETE',
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 Unauthorized if token does not exist in DB', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/logout', {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer nonexistentsession',
          },
        })
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });
});
