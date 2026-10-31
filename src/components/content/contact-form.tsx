"use client";

import { useActionState } from "react";
import { contactAction } from "@/actions/content";

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, { message: "" });
  return (
    <form action={action} className="grid gap-3">
      <label>Name<input className="mt-1 h-11 w-full border border-line px-3" name="name" required /></label>
      <label>Email<input className="mt-1 h-11 w-full border border-line px-3" name="email" required type="email" /></label>
      <label>Topic<input className="mt-1 h-11 w-full border border-line px-3" name="topic" required /></label>
      <label>Message<textarea className="mt-1 w-full border border-line p-3" name="message" required rows={5} /></label>
      {state.message ? <p role="status">{state.message}</p> : null}
      <button className="h-11 bg-navy text-ivory" disabled={pending} type="submit">Send message</button>
    </form>
  );
}
