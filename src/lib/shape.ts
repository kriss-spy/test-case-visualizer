import type { DataNode, DetectedDatatype, DataArray, DataObject } from "./types";

export interface TableMetadata {
  rows: number;
  columns: number;
  headers: string[];
}

export function detectDatatype(node: DataNode): DetectedDatatype {
  if (Array.isArray(node)) {
    if (isTableData(node)) {
      return "table";
    }
    const shape = inferShape(node);
    if (shape.length >= 3) {
      return "tensor";
    }
    if (shape.length === 2 && shape[1] !== undefined) {
      return "matrix";
    }
    return "array";
  }

  if (node !== null && typeof node === "object") {
    return "object";
  }

  if (isPrimitive(node)) {
    return "primitive";
  }

  return "unknown";
}

export function inferShape(node: DataNode): number[] {
  if (Array.isArray(node)) {
    if (node.length === 0) {
      return [0];
    }

    const table = analyzeTable(node);
    if (table) {
      return [table.rows, table.columns];
    }

    const childShapes = node.map((child) => inferShape(child));
    const first = childShapes[0];
    if (first.every((value) => typeof value === "number") &&
      childShapes.every((shape) => arraysEqual(shape, first))) {
      return [node.length, ...first];
    }
    return [node.length];
  }

  return [];
}

export function describeNode(node: DataNode, type: DetectedDatatype, shape: number[]): string {
  const fragments: string[] = [];

  switch (type) {
    case "table": {
      const table = Array.isArray(node) ? analyzeTable(node) : null;
      if (table) {
        const previewHeaders = table.headers.slice(0, 4).join(", ");
        const headerSuffix = table.headers.length > 4 ? ", …" : "";
        fragments.push(`Table ${formatShape(shape)}`);
        if (table.headers.length > 0) {
          fragments.push(`Columns ${previewHeaders}${headerSuffix}`);
        }
      } else {
        fragments.push("Table");
      }
      break;
    }
    case "array":
      fragments.push(`Array (length ${Array.isArray(node) ? node.length : 0})`);
      break;
    case "matrix":
      fragments.push(`Matrix ${formatShape(shape)}`);
      break;
    case "tensor":
      fragments.push(`Tensor ${formatShape(shape)}`);
      break;
    case "object":
      fragments.push(`Object (${Object.keys(node as DataObject).length} keys)`);
      break;
    case "primitive":
      fragments.push(`Primitive: ${String(node)}`);
      break;
    default:
      fragments.push("Unknown type");
  }

  const depth = getDepth(node);
  if (depth > 0) {
    fragments.push(`Depth ${depth}`);
  }

  if (shape.length > 0 && type !== "matrix" && type !== "tensor") {
    fragments.push(`Shape ${formatShape(shape)}`);
  }

  return fragments.join(" • ");
}

export function getDepth(node: DataNode): number {
  if (Array.isArray(node)) {
    if (node.length === 0) {
      return 1;
    }
    return 1 + Math.max(...node.map((child) => getDepth(child)));
  }

  if (isPlainObject(node)) {
    const values = Object.values(node as DataObject);
    if (values.length === 0) {
      return 1;
    }
    return 1 + Math.max(...values.map((child) => getDepth(child)));
  }

  return 0;
}

function formatShape(shape: number[]): string {
  return `[${shape.join(" × ")}]`;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

export function isTableData(node: DataNode): node is DataObject[] {
  return Array.isArray(node) && Boolean(analyzeTable(node));
}

export function analyzeTable(node: DataNode): TableMetadata | null {
  if (!Array.isArray(node) || node.length === 0) {
    return null;
  }

  const rows = node as DataNode[];
  if (!rows.every(isPlainObject)) {
    return null;
  }

  const firstRow = rows[0] as DataObject;
  const headers = Object.keys(firstRow);
  const sortedHeaders = [...headers].sort();
  if (sortedHeaders.length === 0) {
    return null;
  }

  for (const row of rows as DataObject[]) {
    const rowKeys = Object.keys(row).sort();
    if (!arraysEqualStrings(rowKeys, sortedHeaders)) {
      return null;
    }
    const hasOnlyPrimitives = rowKeys.every((key) => isPrimitive(row[key] as DataNode));
    if (!hasOnlyPrimitives) {
      return null;
    }
  }

  return {
    rows: rows.length,
    columns: sortedHeaders.length,
    headers,
  };
}

function arraysEqualStrings(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function isPrimitive(value: DataNode): value is string | number | boolean | null {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}

function isPlainObject(value: DataNode): value is DataObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
