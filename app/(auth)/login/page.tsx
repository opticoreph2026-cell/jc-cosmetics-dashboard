import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-jc-cream p-4">
      <div className="w-full max-w-sm rounded-sm bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo.webp"
            alt="JC Cosmetics"
            width={64}
            height={64}
            className="mb-3 h-16 w-16 rounded-sm object-cover"
          />
          <h1 className="font-display text-3xl tracking-wide text-jc-anchor">JC Cosmetics</h1>
          <p className="mt-1 text-sm text-jc-rose-gold tracking-widest uppercase">Admin Dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
