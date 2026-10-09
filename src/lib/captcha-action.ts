'use server'
import { newCaptcha } from "./captcha";
export async function requestCaptcha(){ return newCaptcha(); }