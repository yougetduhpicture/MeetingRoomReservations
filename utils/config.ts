import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * TypeScript Concept: Interface
 * -----------------------------
 * An interface defines the "shape" of an object - what properties it must have
 * and what types those properties must be. Think of it like a contract that
 * objects must follow.
 *
 * Unlike JavaScript where you might accidentally access config.PROT (typo),
 * TypeScript will catch this at compile time because 'PROT' isn't in the interface.
 */
interface Config {
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: number;
}

/**
 * TypeScript Concept: Type Assertion (the 'as' keyword)
 * -----------------------------------------------------
 * Sometimes you know more about a value's type than TypeScript can infer.
 * process.env values are always string | undefined, but we're providing defaults,
 * so we know they'll be strings. We then convert to the appropriate type.
 */
const config: Config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production',
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10),
};

/**
 * TypeScript Concept: Export Types
 * --------------------------------
 * We can export the interface so other files can use it for type checking.
 * 'export default' exports the config object as the main export of this module.
 */
export { Config };
export default config;
