import { redirect } from "next/navigation";
import { loginAction } from "../actions";
import { ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { inputClass } from "@/lib/admin/styles";
import { LogoMark } from "@/components/ui/Logo";
import { getAuthConfig, getSession } from "@/lib/auth/session";

export const metadata = { title: "ورود" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  const configured = getAuthConfig() !== null;

  return (
    <main className="on-dark grid min-h-svh place-items-center bg-black px-5 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <LogoMark className="mx-auto size-12 text-red" />
        <h1 className="mt-4 text-center text-xl font-bold">ورود به پنل مدیریت</h1>
        <p className="font-display mt-1 text-center text-xs tracking-[0.3em] text-carbon/60">MAMMOTH CAFE</p>

        {configured ? (
          <ActionForm action={loginAction} className="mt-8 space-y-4">
            <Field label="نام کاربری" name="username">
              <input id="username" name="username" autoComplete="username" required dir="ltr" className={inputClass} />
            </Field>
            <Field label="رمز عبور" name="password">
              <input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" className={inputClass} />
            </Field>
            <SubmitButton className="btn btn-dark w-full">ورود</SubmitButton>
          </ActionForm>
        ) : (
          <div data-admin-unconfigured className="mt-8 space-y-3 rounded-2xl bg-soft p-5 text-sm leading-relaxed">
            <p className="font-semibold">پنل مدیریت هنوز پیکربندی نشده است.</p>
            <p>
              برای امنیت، هیچ رمز پیش‌فرضی وجود ندارد. روی سرور دستور زیر را اجرا کنید تا نام کاربری و رمز عبور خود را بسازید، سپس برنامه را
              دوباره راه‌اندازی کنید:
            </p>
            <pre dir="ltr" className="overflow-x-auto rounded-lg bg-black p-3 text-xs text-soft">
              npm run admin:setup
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
