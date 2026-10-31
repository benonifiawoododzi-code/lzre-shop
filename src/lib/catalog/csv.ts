export function normalizeSearchTerm(input: string) {
  const term = input.normalize("NFKC").replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (term.length < 2) return null;
  return term;
}

export type CsvProductRow = {
  name: string;
  description: string;
  category: string;
  price: string;
  stock: number;
  sku: string;
  brand: string;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (quoted && char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseProductCsv(text: string): { rows: CsvProductRow[]; errors: string[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: ["The file is empty."] };
  const header = parseCsvLine(lines[0]!).map((cell) => cell.toLowerCase());
  const expected = ["name", "description", "category", "price", "stock", "sku", "brand"];
  if (expected.some((key, index) => header[index] !== key)) {
    return { rows: [], errors: ["Use the header name,description,category,price,stock,sku,brand."] };
  }
  if (lines.length - 1 > 200) return { rows: [], errors: ["Import up to 200 rows at a time."] };

  const rows: CsvProductRow[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((line, index) => {
    const cells = parseCsvLine(line);
    const [name, description, category, price, stockText, sku, brand] = cells;
    const rowNumber = index + 2;
    if (!name || !description || !category || !price || !sku || !brand) {
      errors.push(`Row ${rowNumber} is missing a required value.`);
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
      errors.push(`Row ${rowNumber} has an invalid price.`);
      return;
    }
    const stock = Number(stockText);
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
      errors.push(`Row ${rowNumber} has an invalid stock quantity.`);
      return;
    }
    rows.push({ name, description, category, price, stock, sku, brand });
  });
  return { rows, errors };
}
