import bcrypt from 'bcrypt';
import { User } from '../types';

const SALT_ROUNDS = 10;

const users: User[] = [
  {
    userId: 'user-1',
    username: 'alice',
    name: 'Alice Johnson',
    passwordHash: bcrypt.hashSync('SecurePass123!', SALT_ROUNDS),
  },
  {
    userId: 'user-2',
    username: 'bob',
    name: 'Bob Smith',
    passwordHash: bcrypt.hashSync('BobSecure2026!', SALT_ROUNDS),
  },
];

export function findUserByUsername(username: string): User | undefined {
  return users.find((user) => user.username === username);
}

export function findUserById(userId: string): User | undefined {
  return users.find((user) => user.userId === userId);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function userExists(userId: string): boolean {
  return users.some((user) => user.userId === userId);
}

export function getAllUsers(): Omit<User, 'passwordHash'>[] {
  return users.map(({ passwordHash: _, ...user }) => user);
}

export function resetUsers(): void {
  users.length = 0;
  users.push(
    {
      userId: 'user-1',
      username: 'alice',
      name: 'Alice Johnson',
      passwordHash: bcrypt.hashSync('SecurePass123!', SALT_ROUNDS),
    },
    {
      userId: 'user-2',
      username: 'bob',
      name: 'Bob Smith',
      passwordHash: bcrypt.hashSync('BobSecure2026!', SALT_ROUNDS),
    }
  );
}
