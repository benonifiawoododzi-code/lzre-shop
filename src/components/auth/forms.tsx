"use client";

import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAction, { message: "" });
  return (
    <form action={action} className="grid gap-3">
      <input name="callbackUrl" type="hidden" value={callbackUrl ?? "/account"} />
      <label>Email<input className="mt-1 h-11 w-full border border-line px-3" name="email" required type="email" /></label>
      <label>Password<input className="mt-1 h-11 w-full border border-line px-3" name="password" required type="password" /></label>
      {state.message ? <p role="alert">{state.message}</p> : null}
      <button className="h-11 bg-navy text-ivory" disabled={pending} type="submit">Sign in</button>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, { message: "" });
  return (
    <form action={action} className="grid gap-3">
      <label>Name<input className="mt-1 h-11 w-full border border-line px-3" name="name" required /></label>
      <label>Email<input className="mt-1 h-11 w-full border border-line px-3" name="email" required type="email" /></label>
      <label>Phone<input className="mt-1 h-11 w-full border border-line px-3" name="phone" required /></label>
      <label>Password<input className="mt-1 h-11 w-full border border-line px-3" minLength={12} name="password" required type="password" /></label>
      <label className="flex gap-2 text-sm"><input name="marketingConsent" type="checkbox" value="true" /> Send marketplace news. Email is sent only when a provider is configured.</label>
      {state.message ? <p role="alert">{state.message}</p> : null}
      <button className="h-11 bg-navy text-ivory" disabled={pending} type="submit">Create account</button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, { message: "" });
  return (
    <form action={action} className="grid gap-3">
      <label>Email<input className="mt-1 h-11 w-full border border-line px-3" name="email" required type="email" /></label>
      {state.message ? <p role="status">{state.message}</p> : null}
      <button className="h-11 bg-navy text-ivory" disabled={pending} type="submit">Send reset link</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, { message: "" });
  return (
    <form action={action} className="grid gap-3">
      <input name="token" type="hidden" value={token} />
      <label>New password<input className="mt-1 h-11 w-full border border-line px-3" minLength={12} name="password" required type="password" /></label>
      {state.message ? <p role="alert">{state.message}</p> : null}
      <button className="h-11 bg-navy text-ivory" disabled={pending} type="submit">Update password</button>
    </form>
  );
}
