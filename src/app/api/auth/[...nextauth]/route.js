import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          });

          if (user && (await bcrypt.compare(credentials.password, user.password))) {
            return { username: user.username, role: user.role };
          }

          return null;
        } catch (error) {
          console.error('Hiba a hitelesítés során:', error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
/* import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    CredentialsProvider({
		async authorize(credentials) {
		  try {
			const user = await prisma.user.findUnique({
			  where: { username: credentials.username },
			});

			if (user && (await bcrypt.compare(credentials.password, user.password))) {
			  return { username: user.username, role: user.role };
			}

			return null;
		  } catch (error) {
			console.error('Hiba a hitelesítés során:', error);
			return null; // Fontos, hogy null-t adj vissza hiba esetén is
		  }
		}
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions); */