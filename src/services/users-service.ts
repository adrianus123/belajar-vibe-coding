import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { users, sessions } from '../db/schema';

/**
 * Mendaftarkan pengguna baru ke dalam database.
 * Fungsi ini akan mengecek apakah email sudah terdaftar, jika belum maka
 * password akan di-hash menggunakan bcrypt dan data pengguna akan disimpan.
 * 
 * @param data Objek yang berisi data pengguna baru (name, email, password)
 * @throws {Error} Jika email sudah terdaftar di database
 */
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

/**
 * Mengautentikasi pengguna berdasarkan email dan password.
 * Fungsi ini memvalidasi kredensial pengguna, dan jika valid,
 * akan membuat sesi baru dan mengembalikan token sesi (UUID).
 * 
 * @param data Objek yang berisi email dan password pengguna
 * @returns Token sesi berupa UUID string
 * @throws {Error} Jika email tidak ditemukan atau password salah
 */
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

/**
 * Mengambil data profil pengguna yang sedang login berdasarkan token sesi.
 * Fungsi ini akan melakukan join antara tabel sessions dan users
 * untuk mendapatkan data profil dari token yang diberikan.
 * 
 * @param token String token sesi yang didapat setelah login
 * @returns Objek profil pengguna (id, name, email, createdAt)
 * @throws {Error} Jika token tidak valid atau tidak ditemukan (Unauthorized)
 */
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

  return result[0]!;
}

/**
 * Menghapus sesi pengguna dari database berdasarkan token.
 * Fungsi ini digunakan untuk proses logout, sehingga token
 * tersebut tidak dapat digunakan lagi.
 * 
 * @param token String token sesi yang akan dihapus
 * @throws {Error} Jika token tidak ditemukan atau gagal dihapus (Unauthorized)
 */
export async function logoutUser(token: string) {
  const [result] = await db.delete(sessions).where(eq(sessions.token, token));
  if (result.affectedRows === 0) {
    throw new Error('Unauthorized');
  }
}

