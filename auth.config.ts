import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { nextUrl } = request;
      const isPublicPath =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/invite/") ||
        nextUrl.pathname.startsWith("/api/auth/") ||
        nextUrl.pathname.startsWith("/api/webhooks/") ||
        nextUrl.pathname === "/api/agents/heartbeat";

      if (isPublicPath) return true;

      // Allow API requests authenticated via Bearer API key
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer mc_live_")) return true;

      if (!isLoggedIn) return false;

      // Onboarding-Redirect: wenn onboardingComplete = false → /onboarding
      const isOnboardingPath = nextUrl.pathname.startsWith("/onboarding");
      const isApiPath = nextUrl.pathname.startsWith("/api/");
      const onboardingComplete = (auth as any)?.user?.onboardingComplete ?? true;

      if (!onboardingComplete && !isOnboardingPath && !isApiPath) {
        return Response.redirect(new URL("/onboarding", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.onboardingComplete = (user as any).onboardingComplete ?? false;
        token.tourComplete = (user as any).tourComplete ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        (session.user as any).onboardingComplete = token.onboardingComplete ?? true;
        (session.user as any).tourComplete = token.tourComplete ?? false;
      }
      return session;
    },
  },
  providers: [],
};
