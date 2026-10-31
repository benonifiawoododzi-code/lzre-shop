"use client";

import { useState } from "react";

export function Gallery({ images }: { images: { url: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const image = images[index] ?? { url: "/demo-image/lzre", alt: "Product" };
  return (
    <div>
      <button className="block w-full bg-sand" onClick={() => setOpen(true)} type="button">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={image.alt} className="aspect-square w-full object-cover" src={image.url} />
      </button>
      <div className="mt-3 flex gap-2">
        {images.map((item, itemIndex) => (
          <button aria-label={`Show image ${itemIndex + 1}`} className={`border ${itemIndex === index ? "border-navy" : "border-transparent"}`} key={item.url} onClick={() => setIndex(itemIndex)} type="button">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="size-16 object-cover" src={item.url} />
          </button>
        ))}
      </div>
      {open ? (
        <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-navy/80 p-4" role="dialog">
          <button className="absolute right-4 top-4 text-ivory" onClick={() => setOpen(false)} type="button">Close</button>
          <button className="text-ivory" onClick={() => setIndex((value) => (value + images.length - 1) % images.length)} type="button">Previous</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={image.alt} className="max-h-[80vh] max-w-full" src={image.url} />
          <button className="text-ivory" onClick={() => setIndex((value) => (value + 1) % images.length)} type="button">Next</button>
        </div>
      ) : null}
    </div>
  );
}
