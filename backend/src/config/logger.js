import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  },
});

// Helper functions for logging
export const logError = (error, context) => {
  logger.error(
    {
      err: error,
      context,
      timestamp: new Date().toISOString(),
    },
    'An error occurred'
  );
};

export const logInfo = (message, data) => {
  logger.info({ data }, message);
};

export const logWarn = (message, data) => {
  logger.warn({ data }, message);
};

export const logDebug = (message, data) => {
  logger.debug({ data }, message);
};
