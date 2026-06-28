import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-jc-cream p-4">
      <div className="w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl tracking-wide text-jc-anchor">JC Cosmetics</h1>
          <p className="mt-1 text-sm text-jc-rose-gold tracking-widest uppercase">Admin Dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
