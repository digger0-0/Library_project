'use server'

import crypto from "node:crypto";
import { Roles, type Role, type SessionData, type User } from "./types";
import { getDb } from "./db";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logger } from "./logger";
import { getClientIp } from "./request";

if(!process.env.SESSION_SECRET){
  logger.fatal("missing session secret", {fn: "auth.ts"});
}

const SECRET = crypto
  .createHash("sha256")
  .update(process.env.SESSION_SECRET as string)
  .digest();

const ALGORITHM = "aes-256-cbc";

const SALT = "salt";

const MAXAGEMS = 24 * 60 * 60 * 1000;

export async function signSession(
  userId: number,
  role: Role
): Promise<string | null>{
  try{
    // prep
    const db = getDb();
    const payload = `${userId}|${Date.now()}|${role}`;
    const iv = crypto.randomBytes(16);
    const expiresAt = new Date(Date.now() + MAXAGEMS);
    const cookieStore = await cookies();
    // verify uid
    const user = db.prepare('SELECT username FROM users WHERE user_id = ?').get(userId) as {username: string};
    if(!user) return null;
    // create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET, iv);
    let encrypted = cipher.update(payload, "utf8", "hex");
    encrypted += cipher.final("hex");
    const session = `${iv.toString('hex')}|${encrypted}`;
    // write to db
    db.prepare('UPDATE users SET session = ? WHERE user_id = ?').run(session, userId);
    // write to cookie
    const isHttps = (await headers()).get("x-forwarded-proto") === "https";
    cookieStore.set('session', session, {
      httpOnly: true,
      secure: isHttps,
      expires: expiresAt,
      sameSite: "lax",
      path: '/'
    })
    cookieStore.set('username', user.username, {
      httpOnly: false,
      expires: expiresAt,
      sameSite: "lax",
      path: '/'
    });

    logger.info("session signed", {fn: "signSession", userId});
    return session;
  }catch(err){
    logger.error("signSession failed", {
      fn: "signSession",
      userId: userId
    }, err);
    return null;
  }
}

export async function verifySession(
  is_high_level: boolean = false,
  session?: string | undefined,
  maxAgeMs: number = MAXAGEMS,
): Promise<SessionData | null> {
  try {
    const cookie = await cookies();
    if(!session){
      session = cookie.get("session")?.value;
      if(!session){
        return null;
      }
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
    const username = cookie.get("username")?.value;
    // expire key
    if (Date.now() - createdAt > maxAgeMs){
      return null;
    }
    // invalid key
    if (role !== "user" && role !== "admin"){
      return null;
    }

    // high level auth
    if(is_high_level){
      // fetch from db
      const db = getDb();
      const db_sessionKey = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as User;

      if(db_sessionKey.session != session){
        return null;
      }
    }

    return { userId, role: role as Role, createdAt, username };
  } catch(err){
    logger.error("verifySession failed", {
      fn: "verifySession",
      is_high_level: is_high_level
    }, err);
    return null;
  }
}

export async function removeSession(userId: number): Promise<FormSate>{
  try{
    const db = getDb();
    db.prepare('UPDATE users SET session = null WHERE user_id = ?').run(userId);
    logger.info("session removed", {fn: "removeSession", userId, ip: await getClientIp()});
    return { success: true, message: "" }
  }catch(err){
    logger.error("removeSession failed", {
      fn: "removeSession",
      userId: userId
    }, err);
    return { success: false, message: err?.toString() ?? "error" }
  }
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

    if(!password || !username) {
      logger.warning("missing info. login failed", {fn: "login", username, ip: await getClientIp()});
      return { success: false, message: "missing info." };
    }

    const cipherPassword = await encryptPassword(password);
    // validate
    const res = db.prepare('SELECT * FROM users WHERE (username = ? AND password = ?)')
    .get(username, cipherPassword) as User;
    // signSession
    if(res){
      await signSession(res.user_id, res.role);
      logger.info("login success", {fn: "login", user_id: res.user_id, username});
      return { success: true, message: "Login success." };
    }
    logger.warning("incorrect username / password, login failed", {fn: "login", username, ip: await getClientIp()});
    return { success: false, message: "Incorrect username / password." };
  }catch(err){
    logger.error("login failed", {
      fn: "login",
      username: formData.get("username") as string
    }, err);
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
    if(password != rePassword){
      logger.warning("Password inconsistent, signup failed", {fn: "signup", username, ip: await getClientIp()});
      return { success: false,  message: "Password is inconsistent." };
    }
    // validate username existancy
    const row = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
    if(row != undefined){
      logger.warning("Username in use, signup failed", {fn: "signup", username, ip: await getClientIp()});
      return { success: false, message: "Username in use." };
    }
    // save user data
    const newUser = {username: username, password: await encryptPassword(password)};
    const res = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run(newUser.username, newUser.password);

    logger.info("signup success", {fn: "signup", username, ip: await getClientIp()});
    return { success: true, message: "signup success" };
  }catch(err){
    logger.error("signup failed", {
      fn: "signup",
      username: formData.get('username') as string
    }, err);
    return { success: false, message: "Internal error." }
  }
}

export async function logout(){
  try{
    const sessionData = await verifySession();
    const cookieStore = await cookies();
    // remove login cookie
    cookieStore.delete("session");
    cookieStore.delete("username");
    // remove db login state
    if(sessionData?.userId){
      const res = await removeSession(sessionData.userId);
      if(!res.success) throw(res.message);
    }
    logger.info("logout success", {fn: "logout", userId: sessionData?.userId});
    return { success: true, message: "Logout"}
  }catch(err){
    logger.error("logout failed", {
      fn: "logout",
    }, err);
    return { success: false, message: "Internal error." };
  }
}

export async function changeRole(userId: number, targetRole: Role): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData || sessionData.role != "admin"){
      logger.warning("unauthorised access", {fn: "changeRole", operatorId: sessionData?.userId, ip: await getClientIp()});
      return { success: false, message: "unauthorised access" }
    }

    if(!Roles.includes(targetRole)){
      logger.warning("Invalid role", {fn: "changeRole", operatorId: sessionData?.userId});
      return { success: false, message: "Invalid role" };
    }

    const db = getDb();
    // validate userId
    const userRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE user_id = ?`).get(userId) as { count: number };
    if(!userRow.count){
      logger.warning("Invalid userId", {fn: "changeRole", operatorId: sessionData?.userId, target_user_id: userId});
      return { success: false, message: "Invalid userId"}
    }

    // update
    db.prepare(`UPDATE users SET role = ? WHERE user_id = ?`).run(targetRole, userId);

    logger.info("Role change success", {fn: "changeRole", operatorId: sessionData?.userId, target_user_id: userId})
    revalidatePath("/admin/userList");
    return { success: true, message: `Role change on user:${userId} success` }
  }catch(err){
    logger.error("changeRole failed", {
      fn: "changeRole",
      target_user_id: userId,
      targetRole: targetRole
    }, err);
    return { success: false, message: "Internal error." }
  }
}