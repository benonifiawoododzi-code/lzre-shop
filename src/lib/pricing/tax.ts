export type TaxComponentInput = {
  code: string;
  name: string;
  ratePercent: number;
  sequence: number;
  applyOn: "NET" | "RUNNING";
};

export type TaxLine = {
  code: string;
  name: string;
  amount: number;
};

export function extractInclusiveTax(grossPesewas: number, components: TaxComponentInput[]) {
  const active = [...components].filter((component) => component.ratePercent > 0).sort((a, b) => a.sequence - b.sequence);
  if (grossPesewas <= 0 || active.length === 0) {
    return { net: Math.max(0, grossPesewas), tax: 0, lines: [] as TaxLine[] };
  }

  const netComponents = active.filter((component) => component.applyOn === "NET");
  const runningComponents = active.filter((component) => component.applyOn === "RUNNING");
  let netFactor = 1;
  for (const component of netComponents) netFactor += component.ratePercent / 100;
  let runningFactor = 1;
  for (const component of runningComponents) runningFactor *= 1 + component.ratePercent / 100;

  const net = Math.round(grossPesewas / (netFactor * runningFactor));
  const lines: TaxLine[] = [];
  let netTax = 0;
  for (const component of netComponents) {
    const amount = Math.round((net * component.ratePercent) / 100);
    netTax += amount;
    lines.push({ code: component.code, name: component.name, amount });
  }

  let base = net + netTax;
  for (const component of runningComponents) {
    const amount = Math.round((base * component.ratePercent) / 100);
    lines.push({ code: component.code, name: component.name, amount });
    base += amount;
  }

  const drift = grossPesewas - (net + lines.reduce((sum, line) => sum + line.amount, 0));
  const last = lines[lines.length - 1];
  if (last && drift !== 0) last.amount += drift;
  const tax = lines.reduce((sum, line) => sum + line.amount, 0);
  return { net, tax, lines };
}
