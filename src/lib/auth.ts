'use server'

import crypto from "node:crypto";
import { Roles, type Role, type SessionData, type User } from "./types";
import { getDb } from "./db";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logger } from "./logger";
import { getClientIp } from "./request";
import { decryptSession, ALGORITHM, getSecret, SESSION_MAX_AGE_MS } from "./session";
import { FormSate } from "./types";
import { verifyCaptcha } from "./captcha";

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
    const cipher = crypto.createCipheriv(ALGORITHM, getSecret(), iv);
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
  maxAgeMs: number = SESSION_MAX_AGE_MS,
): Promise<SessionData | null> {
  try {
    const cookie = await cookies();
    if(!session){
      session = cookie.get("session")?.value;
      if(!session) return null;
    }

    // grade 1 → shared, dependency-free implementation
    const payload = decryptSession(session, maxAgeMs);
    if(!payload) return null;

    // grade 2 → DB compare (only reached from route/action code, never the middleware)
    if(is_high_level){
      const db = getDb();
      const row = db.prepare('SELECT session FROM users WHERE user_id = ?')
        .get(payload.userId) as { session: string | null } | undefined;
      if(row?.session !== session) return null;
    }

    return { ...payload, username: cookie.get("username")?.value };
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

export async function login(prevState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const username = formData.get("username") as string;
    const password = formData.get('password') as string;

    const captcha = verifyCaptcha(formData);   // consumes the challenge either way
    if(!captcha.success){
      logger.warning("captcha rejected login", { fn: "login", reason: captcha.message, ip: await getClientIp() });
      return { success: false, message: captcha.message };
    }

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

    const captcha = verifyCaptcha(formData);   // consumes the challenge either way
    if(!captcha.success){
      logger.warning("captcha rejected login", { fn: "signup", reason: captcha.message, ip: await getClientIp() });
      return { success: false, message: captcha.message };
    }

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
    return { success: true, message: `Role change on user: ${userId} success` }
  }catch(err){
    logger.error("changeRole failed", {
      fn: "changeRole",
      target_user_id: userId,
      targetRole: targetRole
    }, err);
    return { success: false, message: "Internal error." }
  }
}

export async function changeUsername(newUsername: string): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);
    const userId = sessionData?.userId;
    const role = sessionData?.role as Role;
    const checkUsername = newUsername.trim();

    if(!sessionData || !userId){
      logger.warning("unauthorized access", {fn: "changeUsername", ip: await getClientIp()});
      return { success: false, message: "unauthorised access" };
    }

    if(checkUsername != newUsername){
      logger.warning("Invalid input", {fn: "changeUsername", userId});
      return { success: false, message: "No starting or trailing space" };
    }

    const db = getDb();
    // check if username collide
    const res = db.prepare(`
      SELECT 1 FROM users WHERE username = ?  
    `).get(newUsername);
    if(res){
      logger.warning("New username inuse", {fn: "changeUsername", userId, newUsername});
      return { success: false, message: "Username inuse" };
    }

    // operate
    db.prepare(`
      UPDATE users SET username = ? WHERE user_id = ?
    `).run(newUsername, userId);

    await signSession(userId, role);

    logger.info("Username changed", {fn: "changeUsername", userId, newUsername});
    revalidatePath("/user/settings/");
    return { success: true, message: "Username changed" }
  }catch(err){
    logger.error("changeUsername failed", {
      fn: "changeUsername",
      userId: (await verifySession())?.userId,
      newUsername: newUsername
    }, err);
    return { success: false, message: "Internal error." }
  }
}

export async function changePassword(password: string, newPassword: string): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);
    const user_id = sessionData?.userId;

    if(!sessionData || !user_id){
      logger.warning("unauthorized access", {fn: "changePassword", ip: await getClientIp()});
      return { success: false, message: "unauthorized" };
    }

    // check if current password valid
    const cipherPassword = await encryptPassword(password);
    const cipherNewPassword = await encryptPassword(newPassword);
    const db = getDb();
    const res = db.prepare(`
      SELECT 1 FROM users WHERE (user_id = ? AND password = ?)
    `).get(user_id, cipherPassword);
    if(!res){
      logger.warning("Invalid password", {fn: "changePassword", user_id, password});
      return { success: false, message: "Invalid password" };
    }

    // operate
    db.prepare(`
      UPDATE users SET password = ? WHERE user_id = ?  
    `).run(cipherNewPassword, user_id);
    
    logger.info("Password changed", {fn: "changePassword", user_id, newPassword});
    revalidatePath("/user/settings");
    return { success: true, message: "Password changed" };
  }catch(err){
    logger.error("changePassword failed", {
      fn: "changePassword",
      userId: (await verifySession())?.userId,
      newPassword: newPassword
    }, err);
    return { success: false, message: "Internal error"}
  }
}