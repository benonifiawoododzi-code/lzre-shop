import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const user = await getCurrentUser();
  const rows = await prisma.inventory.findMany({ where: { variant: { product: { sellerId: user?.sellerProfile?.id } } }, include: { variant: { include: { product: true } } } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Inventory</h1>
      <table className="mt-6 w-full text-sm">
        <thead><tr className="text-left"><th>Product</th><th>On hand</th><th>Reserved</th><th>Available</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t border-line" key={row.id}>
              <td className="py-2">{row.variant.product.name} · {row.variant.name}</td>
              <td>{row.onHand}</td>
              <td>{row.reserved}</td>
              <td>{row.available}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
