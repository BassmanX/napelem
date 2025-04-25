import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id?: string | null;
      role?: string | null;
      username?: string | null; // A szükséges kiterjesztés
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
     id?: string | null;
     role?: string | null;
     username?: string | null; // A szükséges kiterjesztés
  }
}