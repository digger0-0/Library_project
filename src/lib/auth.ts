'use server'

import crypto from "node:crypto";
import type { SessionData, User } from "./types";
import { getDb } from "./db";
import { cookies } from "next/headers";

const SECRET = crypto
  .createHash("sha256")
  .update(process.env.SESSION_SECRET || "default-dev-secret")
  .digest();

const ALGORITHM = "aes-256-cbc";

const SALT = "salt";

const MAXAGEMS = 24 * 60 * 60 * 1000;

export async function signSession(
  userId: number,
  role: "user" | "admin"
): Promise<string | null>{
  try{
    // prep
    const db = getDb();
    const payload = `${userId}|${Date.now()}|${role}`;
    const iv = crypto.randomBytes(16);
    const expiresAt = new Date(Date.now() + MAXAGEMS);
    const cookieStore = await cookies();
    // verify uid
    const user = db.prepare('SELECT 1 FROM users WHERE user_id = ?').get(userId);
    if(!user) return null;
    // create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET, iv);
    let encrypted = cipher.update(payload, "utf8", "hex");
    encrypted += cipher.final("hex");
    const session = `${iv.toString('hex')}|${encrypted}`;
    // write to db
    db.prepare('UPDATE users SET session = ? WHERE user_id = ?').run(session, userId);
    // write to cookie
    cookieStore.set('session', session, {
      httpOnly: true,
      secure: true,
      expires: expiresAt,
      sameSite: "lax",
      path: '/'
    })

    return session;
  }catch(err){
    console.log("signSession: ", String(err), new Date());
    return null;
  }
}

export async function verifySession(
  is_high_level: boolean = false,
  session?: string | undefined,
  maxAgeMs: number = MAXAGEMS,
): Promise<SessionData | null> {
  try {
    if(!session){
      const cookie = await cookies();
      session = cookie.get("session")?.value;
      if(!session) return null;
    }
    const [iv, encryptedData] = session.split('|');
    // extract data
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      SECRET,
      Buffer.from(iv, "hex")
    );
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    // destruct data
    const [ userIdStr, timestamp, role] = decrypted.split("|");
    const userId = Number(userIdStr);
    const createdAt = Number(timestamp);
    // expire key
    if (Date.now() - createdAt > maxAgeMs) return null;
    // invalid key
    if (role !== "user" && role !== "admin") return null;

    // high level auth
    if(is_high_level){
      // fetch from db
      const db = getDb();
      const db_sessionKey = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as User;

      if(db_sessionKey.session != session) return null;
    }

    return { userId, role: role as "user" | "admin", createdAt };
  } catch(err){
    console.log("verifySession: ", String(err), new Date());
    return null;
  }
}

export async function removeSession(userId: number){
  const db = getDb();
  db.prepare('UPDATE users SET session = null WHERE user_id = ?').run(userId);
}

export async function encryptPassword(password: string){
  const key = crypto.scryptSync(password, SALT, 32);
  return key.toString('hex');
}

export type FormSate = {
  success: boolean;
  message: string;
}

export async function login(prevState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const username = formData.get("username") as string;
    const password = formData.get('password') as string;
    const db = getDb();

    if(!password || !username) return { success: false, message: "missing info." }

    const cipherPassword = await encryptPassword(password);
    // validate
    const res = db.prepare('SELECT * FROM users WHERE (username = ? AND password = ?)')
    .get(username, cipherPassword) as User;
    // signSession
    if(res){
      await signSession(res.user_id, res.role);
      return { success: true, message: "Login success." };
    }
    return { success: false, message: "Incorrect username / password." };
  }catch(err){
    console.log("login: ", String(err), new Date());
    return { success: false, message: "Internal error." }
  }
}

export async function signup(prevState: FormSate| undefined, formData: FormData): Promise<FormSate>{
  try{
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const rePassword = formData.get('re-password') as string;
    const db = getDb();
    // validate password
    if(password != rePassword) return { success: false,  message: "Password is inconsistent." };
    // validate username existancy
    const row = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
    if(row != undefined) return { success: false, message: "Username in use." };
    // save user data
    const newUser = {username: username, password: await encryptPassword(password)};
    const res = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run(newUser.username, newUser.password);

    return { success: true, message: "signup success" };
  }catch(err){
    console.log("signup: ", String(err), new Date());
    return { success: false, message: "Internal error." }
  }
}