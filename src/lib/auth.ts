import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                const user = await prisma.user.findFirst({
                    where: {
                        email: email,
                        isActive: true,
                    },
                    include: {
                        company: true,
                    },
                });

                if (!user) {
                    return null;
                }

                const isPasswordValid = await compare(password, user.passwordHash);

                if (!isPasswordValid) {
                    // Log failed login
                    await prisma.loginHistory.create({
                        data: {
                            userId: user.id,
                            companyId: user.companyId,
                            success: false,
                        },
                    });
                    return null;
                }

                // Log successful login
                await prisma.loginHistory.create({
                    data: {
                        userId: user.id,
                        companyId: user.companyId,
                        success: true,
                    },
                });

                // Update last login
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() },
                });

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    companyId: user.companyId,
                    companyName: user.company?.name || null,
                    systemRole: user.systemRole,
                    roleId: user.roleId,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
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
});
