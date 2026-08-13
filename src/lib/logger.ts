import "server-only";
import { existsSync, readdirSync, statSync, appendFileSync, rmSync, mkdirSync } from "node:fs";
import { cwd } from "node:process";
import path from "node:path";
import { LogPriority, type Log } from "./types";

const logPath = path.resolve(process.env.LOG_PATH || path.join(cwd(), "logs"));
const logSize = Number(process.env.LOG_SIZE) || 1048576;
const logKeep = Number(process.env.LOG_KEEP) || 5;
const minPriority =
  LogPriority.get((process.env.LOG_LEVEL || "debug").toLowerCase()) ?? 10;

// console color
const RED = "\x1b[31m";
const REDFULL = "\x1b[31;3m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GREY = "\x1b[90m";
const RESET = "\x1b[0m";

const Color = new Map<string, string>([
  ["debug", GREY],
  ["info", CYAN],
  ["warning", YELLOW],
  ["error", RED],
  ["fatal", REDFULL],
]);

function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
}

export class Logger {
  index: number;
  indexes: number[];
  logFile: string;

  constructor(){
    mkdirSync(logPath, { recursive: true }); // first run: create src/logs
    this.indexes = readdirSync(logPath)
      .map((fn) => Number(fn.split(".").at(-1)))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    this.index = this.indexes.at(-1) ?? 1;
    this.logFile = `${logPath}/app.log.${this.index}`;
  }

  private rotateIfNeeded(){
    if(existsSync(this.logFile) && statSync(this.logFile).size > logSize){
      this.index += 1;
      this.logFile = `${logPath}/app.log.${this.index}`;
      this.indexes.push(this.index);
      const minIndex = this.indexes[0];
      if(minIndex !== undefined && this.index - minIndex >= logKeep){
        const oldest = `${logPath}/app.log.${minIndex}`;
        if(existsSync(oldest)) rmSync(oldest);
        this.indexes.shift();
      }
    }
  }

  private run(level: string, msg: string, meta?: Record<string, unknown>, err?: unknown){
    // log level filter
    const priority = LogPriority.get(level) ?? 40;
    if(priority < minPriority) return;

    this.rotateIfNeeded();

    // prepare
    const ts = new Date().toISOString();
    const log: Log = {
      ts,
      level: level as Log["level"],
      msg,
      meta,
      err: err === undefined ? undefined : serializeError(err),
    };

    // console
    const tag = `${Color.get(level) ?? ""}[${level}]${RESET}`;
    if(["warning", "error", "fatal"].includes(level)){
      console.error(`${ts} ${tag} ${msg}`);
    }else{
      console.log(`${ts} ${tag} ${msg}`);
    }
    // log file
    appendFileSync(this.logFile, JSON.stringify(log) + "\n");
  }

  debug(msg: string, meta?: Record<string, unknown>): void{
    this.run("debug", msg, meta);
  }
  info(msg: string, meta?: Record<string, unknown>): void{
    this.run("info", msg, meta);
  }
  warning(msg: string, meta?: Record<string, unknown>): void{
    this.run("warning", msg, meta);
  }
  error(msg: string, meta?: Record<string, unknown>, err?: unknown): void{
    this.run("error", msg, meta, err);
  }
  fatal(msg: string, meta?: Record<string, unknown>, err?: unknown): void{
    this.run("fatal", msg, meta, err);
  }
}

export const logger = new Logger();