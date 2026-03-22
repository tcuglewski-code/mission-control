import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPath =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/invite/");

      if (isPublicPath) return true;
      if (isLoggedIn) return true;
      return false;
    },
    jwt({ token, user }) {
      if (user) {
        // Only store the user ID in the JWT.
        // All other fields (role, permissions, projectAccess) are loaded
        // fresh from the database on each API request so that admin changes
        // take effect immediately without requiring the user to re-login.
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        // role / permissions are NOT stored here — always loaded live from DB
        // via getSessionOrApiKey() or requireAdminFromDb() in API routes.
      }
      return session;
    },
  },
  providers: [],
};
