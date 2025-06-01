import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  defaultMeta: { service: 'mcp-documentation' },
  transports: [
    new winston.transports.Console()
  ]
});