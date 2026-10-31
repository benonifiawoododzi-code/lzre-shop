"use client";

import { useMemo, useState } from "react";
import { placeOrderAction } from "@/actions/checkout";
import { ghanaRegions } from "@/config/ghana";
import { formatMoney } from "@/lib/pricing/money";

type Method = { code: string; name: string; description: string; estimatedMinDays: number; estimatedMaxDays: number };
type Address = { id: string; fullName: string; phone: string; line1: string; city: string; region: string; ghanaPostGps: string | null };

export function CheckoutForm({
  currency,
  methods,
  codAllowed,
  paystack,
  sandbox,
  addresses,
  defaults,
  summary,
}: {
  currency: string;
  methods: Method[];
  codAllowed: boolean;
  paystack: boolean;
  sandbox: boolean;
  addresses: Address[];
  defaults: { name: string; email: string; phone: string };
  summary: { merchandise: number; discount: number; shipping: number; tax: number; grand: number; errors: string[] };
}) {
  const idempotencyKey = useMemo(() => crypto.randomUUID().replace(/-/g, ""), []);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [customer, setCustomer] = useState({ ...defaults, note: "" });
  const [address, setAddress] = useState({ fullName: defaults.name, phone: defaults.phone, line1: "", line2: "", city: "", region: addresses[0]?.region || "Greater Accra", ghanaPostGps: "", postalCode: "", instructions: "" });
  const [methodCode, setMethodCode] = useState(methods[0]?.code ?? "");
  const [payment, setPayment] = useState<"PAYSTACK" | "CASH_ON_DELIVERY" | "SANDBOX">(paystack ? "PAYSTACK" : sandbox ? "SANDBOX" : "CASH_ON_DELIVERY");

  function applySavedAddress(id: string) {
    const saved = addresses.find((item) => item.id === id);
    if (!saved) return;
    setAddress({ ...address, fullName: saved.fullName, phone: saved.phone, line1: saved.line1, city: saved.city, region: saved.region, ghanaPostGps: saved.ghanaPostGps ?? "" });
  }

  async function submit() {
    setPending(true);
    setMessage("");
    const result = await placeOrderAction({ idempotencyKey, customer, address, methodCode, paymentChoice: payment, saveAddress: true });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message ?? "Checkout could not be completed.");
      return;
    }
    if ("next" in result && result.next) window.location.href = result.next;
  }

  return (
    <div className="grid gap-6">
      <ol className="flex flex-wrap gap-3 text-sm">
        {["Details", "Address", "Delivery", "Payment", "Review"].map((label, index) => <li className={step === index + 1 ? "font-semibold text-navy" : "text-muted"} key={label}>{index + 1}. {label}</li>)}
      </ol>
      {step === 1 ? (
        <div className="grid gap-3">
          <label>Full name<input className="mt-1 h-11 w-full border border-line px-3" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></label>
          <label>Email<input className="mt-1 h-11 w-full border border-line px-3" type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label>
          <label>Phone<input className="mt-1 h-11 w-full border border-line px-3" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label>
          <label>Note<textarea className="mt-1 w-full border border-line p-3" value={customer.note ?? ""} onChange={(event) => setCustomer({ ...customer, note: event.target.value })} /></label>
          <button className="h-11 bg-navy text-ivory" onClick={() => setStep(2)} type="button">Continue</button>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid gap-3">
          {addresses.length > 0 ? <select className="h-11 border border-line px-2" onChange={(event) => applySavedAddress(event.target.value)}><option value="">Saved addresses</option>{addresses.map((item) => <option key={item.id} value={item.id}>{item.line1}, {item.city}</option>)}</select> : null}
          <label>Recipient<input className="mt-1 h-11 w-full border border-line px-3" value={address.fullName} onChange={(event) => setAddress({ ...address, fullName: event.target.value })} /></label>
          <label>Phone<input className="mt-1 h-11 w-full border border-line px-3" value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })} /></label>
          <label>Address<input className="mt-1 h-11 w-full border border-line px-3" value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} /></label>
          <label>City<input className="mt-1 h-11 w-full border border-line px-3" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} /></label>
          <label>Region<select className="mt-1 h-11 w-full border border-line px-2" value={address.region} onChange={(event) => setAddress({ ...address, region: event.target.value })}>{ghanaRegions.map((region) => <option key={region}>{region}</option>)}</select></label>
          <label>GhanaPost GPS<input className="mt-1 h-11 w-full border border-line px-3" value={address.ghanaPostGps} onChange={(event) => setAddress({ ...address, ghanaPostGps: event.target.value })} /></label>
          <label>Delivery note<textarea className="mt-1 w-full border border-line p-3" value={address.instructions} onChange={(event) => setAddress({ ...address, instructions: event.target.value })} /></label>
          <div className="flex gap-3"><button type="button" onClick={() => setStep(1)}>Back</button><button className="h-11 bg-navy px-4 text-ivory" onClick={() => setStep(3)} type="button">Continue</button></div>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="grid gap-3">
          {methods.map((method) => (
            <label className="border border-line p-3" key={method.code}>
              <input checked={methodCode === method.code} name="method" onChange={() => setMethodCode(method.code)} type="radio" /> {method.name}
              <span className="mt-1 block text-sm text-muted">{method.description} Estimated {method.estimatedMinDays}–{method.estimatedMaxDays} days. This is not live courier tracking.</span>
            </label>
          ))}
          <div className="flex gap-3"><button type="button" onClick={() => setStep(2)}>Back</button><button className="h-11 bg-navy px-4 text-ivory" onClick={() => setStep(4)} type="button">Continue</button></div>
        </div>
      ) : null}
      {step === 4 ? (
        <div className="grid gap-3">
          {paystack ? <label><input checked={payment === "PAYSTACK"} name="pay" onChange={() => setPayment("PAYSTACK")} type="radio" /> Paystack — card or mobile money. The order is paid only after a verified webhook.</label> : <p>Paystack is not configured, so card and mobile money checkout is unavailable.</p>}
          {codAllowed ? <label><input checked={payment === "CASH_ON_DELIVERY"} name="pay" onChange={() => setPayment("CASH_ON_DELIVERY")} type="radio" /> Cash on delivery. The order stays unpaid until collection is recorded.</label> : <p>Cash on delivery is not offered for {address.region}.</p>}
          {sandbox ? <label><input checked={payment === "SANDBOX"} name="pay" onChange={() => setPayment("SANDBOX")} type="radio" /> Development sandbox. No money is collected and the order is not marked paid.</label> : null}
          <div className="flex gap-3"><button type="button" onClick={() => setStep(3)}>Back</button><button className="h-11 bg-navy px-4 text-ivory" onClick={() => setStep(5)} type="button">Review order</button></div>
        </div>
      ) : null}
      {step === 5 ? (
        <div className="grid gap-2 text-sm">
          <p>{customer.name} · {customer.email} · {customer.phone}</p>
          <p>{address.line1}, {address.city}, {address.region}</p>
          <p>Delivery: {methods.find((method) => method.code === methodCode)?.name}</p>
          <p>Payment: {payment === "SANDBOX" ? "Development sandbox" : payment === "CASH_ON_DELIVERY" ? "Cash on delivery" : "Paystack"}</p>
          <p>Merchandise {formatMoney(summary.merchandise, currency)}</p>
          <p>Discount {formatMoney(summary.discount, currency)}</p>
          <p>Shipping {formatMoney(summary.shipping, currency)}</p>
          <p>Tax included {formatMoney(summary.tax, currency)}</p>
          <p className="font-semibold">Total {formatMoney(summary.grand, currency)}</p>
          {summary.errors.map((error) => <p className="text-danger" key={error}>{error}</p>)}
          {message ? <p role="alert">{message}</p> : null}
          <div className="flex gap-3"><button type="button" onClick={() => setStep(4)}>Back</button><button className="h-11 bg-signal px-4 font-semibold text-white" disabled={pending || summary.errors.length > 0} onClick={submit} type="button">{pending ? "Placing order" : "Place order"}</button></div>
        </div>
      ) : null}
    </div>
  );
}
