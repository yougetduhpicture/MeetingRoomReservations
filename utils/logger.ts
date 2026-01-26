import config from './config';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

type LogLevelName = keyof typeof LogLevel;

class Logger {
  private level: LogLevel;

  constructor() {
    if (config.NODE_ENV === 'test') {
      this.level = LogLevel.ERROR + 1;
    } else if (config.NODE_ENV === 'development') {
      this.level = LogLevel.DEBUG;
    } else {
      this.level = LogLevel.INFO;
    }
  }

  private formatMessage(level: LogLevelName, message: string, meta?: object): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaString}`;
  }

  private log(level: LogLevel, levelName: LogLevelName, message: string, meta?: object): void {
    if (level >= this.level) {
      const formattedMessage = this.formatMessage(levelName, message, meta);

      switch (level) {
        case LogLevel.ERROR:
          // eslint-disable-next-line no-console
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          // eslint-disable-next-line no-console
          console.warn(formattedMessage);
          break;
        default:
          // eslint-disable-next-line no-console
          console.log(formattedMessage);
      }
    }
  }

  debug(message: string, meta?: object): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  info(message: string, meta?: object): void {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  warn(message: string, meta?: object): void {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  error(message: string, meta?: object): void {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  request(method: string, path: string, statusCode?: number): void {
    const meta = statusCode !== undefined ? { statusCode } : undefined;
    this.info(`${method} ${path}`, meta);
  }
}

const logger = new Logger();
export default logger;
