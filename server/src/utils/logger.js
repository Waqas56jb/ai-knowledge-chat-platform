/**
 * Structured logger. Secrets, tokens, passwords and authorization headers are redacted.
 * Private document and conversation content must never be passed to the logger.
 */
import pino from 'pino';

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info');

export const logger = pino({
  level,
  base: { service: 'nexus-ai-server' },
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie', 'headers.authorization',
      '*.password', '*.token', '*.access_token', '*.refresh_token', '*.apiKey', '*.api_key',
      'password', 'token', 'access_token', 'refresh_token', 'invitationToken'
    ],
    censor: '[redacted]'
  },
  ...(process.env.NODE_ENV === 'development' && process.stdout.isTTY ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' } } } : {})
});
