/**
 * TypeScript Concept: Declaration Merging & Module Augmentation
 * -------------------------------------------------------------
 * This is one of TypeScript's more advanced features. When you install
 * @types/express, it defines what the Request object looks like. But we
 * want to add our own 'user' property after JWT authentication.
 *
 * Declaration merging lets us "extend" existing type definitions without
 * modifying the original package. It's like saying "Express's Request
 * type also has these additional properties in our project."
 *
 * The .d.ts Extension
 * -------------------
 * Files ending in .d.ts are "declaration files" - they contain only type
 * information, no runtime code. TypeScript uses them to understand the
 * shape of JavaScript libraries and to augment existing types.
 */

import { TokenPayload } from './index';

/**
 * TypeScript Concept: Global Declaration
 * --------------------------------------
 * 'declare global' tells TypeScript we're adding to the global scope.
 * Inside, we're opening up the Express namespace and adding to the
 * Request interface.
 *
 * Without this, TypeScript would complain when we try to access req.user
 * because the default Express Request type doesn't have a 'user' property.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * The authenticated user's token payload.
       * This is set by our auth middleware after JWT verification.
       *
       * The '?' makes this optional because not all requests will be
       * authenticated (e.g., the login endpoint).
       */
      user?: TokenPayload;
    }
  }
}

/**
 * TypeScript Concept: Empty Export
 * --------------------------------
 * This empty export statement is necessary to make this file a "module"
 * rather than a "script". In TypeScript:
 *
 * - A "script" file's declarations go into the global scope automatically
 * - A "module" file (has import/export) keeps declarations scoped
 *
 * We need it to be a module because we're using 'import' at the top,
 * but we also need 'declare global' to work properly.
 */
export {};
