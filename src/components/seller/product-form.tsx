"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveProductAction } from "@/actions/seller";
import { productSchema } from "@/lib/validation/schemas";

type Values = {
  name: string;
  description: string;
  categoryId: string;
  brandName?: string;
  condition: "NEW" | "REFURBISHED" | "USED";
  currency: string;
  weightGrams: number;
  lowStockThreshold: number;
  metaTitle?: string;
  metaDescription?: string;
  attributes: { name: string; value: string }[];
  variants: { sku: string; name: string; price: string; compareAtPrice?: string; stock: number; options: Record<string, string> }[];
};

export function ProductForm({ categories, currency, productId, initial }: { categories: { id: string; name: string }[]; currency: string; productId?: string; initial?: Partial<Values> }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      categoryId: initial?.categoryId ?? categories[0]?.id ?? "",
      brandName: initial?.brandName ?? "",
      condition: initial?.condition ?? "NEW",
      currency,
      weightGrams: initial?.weightGrams ?? 0,
      lowStockThreshold: initial?.lowStockThreshold ?? 5,
      metaTitle: initial?.metaTitle ?? "",
      metaDescription: initial?.metaDescription ?? "",
      attributes: initial?.attributes ?? [{ name: "Brand", value: "" }],
      variants: initial?.variants ?? [{ sku: "", name: "Standard", price: "", compareAtPrice: "", stock: 0, options: {} }],
    },
  });
  const attributes = useFieldArray({ control: form.control, name: "attributes" });
  const variants = useFieldArray({ control: form.control, name: "variants" });

  return (
    <form className="grid max-w-2xl gap-3" onSubmit={form.handleSubmit(async (values) => {
      const result = await saveProductAction({ ...values, id: productId });
      if (!result.ok) setMessage(result.message);
      else router.push(result.href);
    })}>
      <label>Name<input className="mt-1 h-11 w-full border border-line px-3" {...form.register("name")} /></label>
      <label>Description<textarea className="mt-1 w-full border border-line p-3" rows={5} {...form.register("description")} /></label>
      <label>Category<select className="mt-1 h-11 w-full border border-line px-2" {...form.register("categoryId")}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Brand<input className="mt-1 h-11 w-full border border-line px-3" {...form.register("brandName")} /></label>
      <label>Condition<select className="mt-1 h-11 w-full border border-line px-2" {...form.register("condition")}><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="USED">Used</option></select></label>
      <label>Weight (g)<input className="mt-1 h-11 w-full border border-line px-3" type="number" {...form.register("weightGrams")} /></label>
      <label>Low stock threshold<input className="mt-1 h-11 w-full border border-line px-3" type="number" {...form.register("lowStockThreshold")} /></label>
      <input type="hidden" {...form.register("currency")} />
      <h2 className="font-display text-2xl">Attributes</h2>
      {attributes.fields.map((field, index) => (
        <div className="grid grid-cols-2 gap-2" key={field.id}>
          <input className="h-11 border border-line px-2" placeholder="Name" {...form.register(`attributes.${index}.name`)} />
          <input className="h-11 border border-line px-2" placeholder="Value" {...form.register(`attributes.${index}.value`)} />
        </div>
      ))}
      <button onClick={() => attributes.append({ name: "", value: "" })} type="button">Add attribute</button>
      <h2 className="font-display text-2xl">Variants</h2>
      {variants.fields.map((field, index) => (
        <div className="grid gap-2 border border-line p-3" key={field.id}>
          <input className="h-11 border border-line px-2" placeholder="SKU" {...form.register(`variants.${index}.sku`)} />
          <input className="h-11 border border-line px-2" placeholder="Name" {...form.register(`variants.${index}.name`)} />
          <input className="h-11 border border-line px-2" placeholder="Price" {...form.register(`variants.${index}.price`)} />
          <input className="h-11 border border-line px-2" placeholder="Compare price" {...form.register(`variants.${index}.compareAtPrice`)} />
          <input className="h-11 border border-line px-2" placeholder="Stock" type="number" {...form.register(`variants.${index}.stock`)} />
        </div>
      ))}
      <button onClick={() => variants.append({ sku: "", name: "", price: "", compareAtPrice: "", stock: 0, options: {} })} type="button">Add variant</button>
      {message ? <p role="alert">{message}</p> : null}
      <button className="h-11 bg-navy text-ivory" type="submit">Submit for review</button>
    </form>
  );
}
