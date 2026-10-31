"use client";

import { useActionState } from "react";
import { applySellerAction } from "@/actions/seller";
import { ghanaRegions } from "@/config/ghana";

export function SellerApplicationForm() {
  const [state, action, pending] = useActionState(applySellerAction, { message: "" });
  return (
    <form action={action} className="grid gap-3">
      <label>Store name<input className="mt-1 h-11 w-full border border-line px-3" name="storeName" required /></label>
      <label>Description<textarea className="mt-1 w-full border border-line p-3" name="description" required rows={4} /></label>
      <label>Business type<select className="mt-1 h-11 w-full border border-line px-2" name="businessType"><option value="INDIVIDUAL">Individual</option><option value="REGISTERED_BUSINESS">Registered business</option></select></label>
      <label>Legal name<input className="mt-1 h-11 w-full border border-line px-3" name="legalName" required /></label>
      <label>Registration number<input className="mt-1 h-11 w-full border border-line px-3" name="registrationNo" /></label>
      <label>TIN<input className="mt-1 h-11 w-full border border-line px-3" name="tin" /></label>
      <label>Phone<input className="mt-1 h-11 w-full border border-line px-3" name="phone" required /></label>
      <label>City<input className="mt-1 h-11 w-full border border-line px-3" name="city" required /></label>
      <label>Region<select className="mt-1 h-11 w-full border border-line px-2" name="region">{ghanaRegions.map((region) => <option key={region}>{region}</option>)}</select></label>
      <label>Payout<select className="mt-1 h-11 w-full border border-line px-2" name="payoutType"><option value="MOBILE_MONEY">Mobile money</option><option value="BANK">Bank</option></select></label>
      <label>Network<select className="mt-1 h-11 w-full border border-line px-2" name="momoNetwork"><option value="">None</option><option>MTN</option><option>TELECEL</option><option>AIRTELTIGO</option></select></label>
      <label>Mobile money number<input className="mt-1 h-11 w-full border border-line px-3" name="momoNumber" /></label>
      <label>Bank name<input className="mt-1 h-11 w-full border border-line px-3" name="bankName" /></label>
      <label>Account name<input className="mt-1 h-11 w-full border border-line px-3" name="accountName" /></label>
      <label>Account number<input className="mt-1 h-11 w-full border border-line px-3" name="accountNumber" /></label>
      <label>Notes<textarea className="mt-1 w-full border border-line p-3" name="notes" /></label>
      <label>Verification document<input className="mt-1 block" name="document" type="file" /></label>
      {state.message ? <p role="alert">{state.message}</p> : null}
      <button className="h-11 bg-navy text-ivory" disabled={pending} type="submit">Submit application</button>
    </form>
  );
}
