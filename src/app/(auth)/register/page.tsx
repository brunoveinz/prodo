import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import RegisterForm from "@/components/register-form";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function RegisterPage() {
  const session = await auth();
  const t = await getTranslations("Auth.register");

  if (session) {
    redirect("/");
  }

  return (
    <div className="space-y-8">
      {/* Logo - visible on mobile only since the left panel has it on md+ */}
      <div className="text-center md:text-left space-y-2">
        <div className="md:hidden flex flex-col items-center md:items-start mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">PRODO</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground mt-2">{t("focus")}</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("createAccount")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
