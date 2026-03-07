import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    providers: [],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.companyId = (user as any).companyId;
                token.companyName = (user as any).companyName;
                token.systemRole = (user as any).systemRole;
                token.roleId = (user as any).roleId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as any).companyId = token.companyId;
                (session.user as any).companyName = token.companyName;
                (session.user as any).systemRole = token.systemRole;
                (session.user as any).roleId = token.roleId;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
