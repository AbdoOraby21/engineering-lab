import pino from 'pino';
import { env, isDevelopment, isTest } from '../config/env.js';

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'engineering-lab-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'token',
    ],
    censor: '[redacted]',
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
      }
    : undefined,
});
