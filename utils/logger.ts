import config from './config';

/**
 * TypeScript Concept: Enum
 * ------------------------
 * Enums define a set of named constants. They're useful when you have
 * a fixed set of related values. Here, we define log levels.
 *
 * By default, enums are numeric (INFO = 0, WARN = 1, etc.), but you can
 * also create string enums: enum Level { INFO = 'INFO', WARN = 'WARN' }
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * TypeScript Concept: Type from Enum Keys
 * ---------------------------------------
 * 'keyof typeof LogLevel' gives us a union type of the enum keys:
 * 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
 *
 * This is useful when you want to accept enum keys as strings.
 */
type LogLevelName = keyof typeof LogLevel;

/**
 * Simple Logger Utility
 * ---------------------
 * A lightweight logger that:
 * - Respects log levels (DEBUG < INFO < WARN < ERROR)
 * - Includes timestamps
 * - Silences output in test environment
 * - Uses structured format for easy parsing
 *
 * In production, you'd likely use a library like Winston or Pino,
 * but this demonstrates the concepts without extra dependencies.
 */
class Logger {
  private level: LogLevel;

  constructor() {
    // Set log level based on environment
    // Test environment is silent by default, development shows all
    if (config.NODE_ENV === 'test') {
      this.level = LogLevel.ERROR + 1; // Silent - nothing will log
    } else if (config.NODE_ENV === 'development') {
      this.level = LogLevel.DEBUG;
    } else {
      this.level = LogLevel.INFO;
    }
  }

  /**
   * TypeScript Concept: Private Methods
   * -----------------------------------
   * The 'private' keyword means this method can only be called from
   * within this class, not from outside. It's an implementation detail.
   */
  private formatMessage(level: LogLevelName, message: string, meta?: object): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaString}`;
  }

  /**
   * TypeScript Concept: Rest Parameters with Spread
   * ------------------------------------------------
   * The '...args' syntax collects all remaining arguments into an array.
   * We use 'unknown[]' as the type because we don't know what types
   * the caller might pass.
   *
   * 'unknown' is safer than 'any' because you must check the type
   * before using the value, preventing accidental misuse.
   */
  private log(level: LogLevel, levelName: LogLevelName, message: string, meta?: object): void {
    if (level >= this.level) {
      const formattedMessage = this.formatMessage(levelName, message, meta);

      // Use appropriate console method based on level
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

  /**
   * Public logging methods
   * ----------------------
   * These are the methods external code will call.
   * Each corresponds to a log level.
   */
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

  /**
   * Log an HTTP request
   * -------------------
   * Convenience method for logging incoming requests.
   */
  request(method: string, path: string, statusCode?: number): void {
    const meta = statusCode !== undefined ? { statusCode } : undefined;
    this.info(`${method} ${path}`, meta);
  }
}

/**
 * TypeScript Concept: Singleton Export
 * ------------------------------------
 * We export a single instance of the Logger class. This means all
 * parts of the application share the same logger instance, ensuring
 * consistent configuration.
 *
 * This is the "singleton pattern" - there's only one logger instance.
 */
const logger = new Logger();
export default logger;
