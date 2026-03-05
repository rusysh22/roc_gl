import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            companyId: string | null;
            companyName: string | null;
            systemRole: string;
            roleId: string | null;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        companyId: string | null;
        companyName: string | null;
        systemRole: string;
        roleId: string | null;
    }
}
