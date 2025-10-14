import JSON5 from "json5";
import { z, ZodError } from "zod";
import type { DataNode, ParseIssue, SupportedManualType } from "./types";
import { detectDatatype, describeNode, inferShape } from "./shape.js";

const DataSchema: z.ZodType<DataNode> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(DataSchema),
    z.record(DataSchema),
  ])
);

const PYTHON_KEYWORDS: Array<{ pattern: RegExp; replacement: string; hint: string }> = [
  { pattern: /\bNone\b/g, replacement: "null", hint: "Replaced Python 'None' with JSON null." },
  { pattern: /\bTrue\b/g, replacement: "true", hint: "Replaced Python 'True' with JSON true." },
  { pattern: /\bFalse\b/g, replacement: "false", hint: "Replaced Python 'False' with JSON false." },
];

const TRAILING_COMMA = /,\s*([\]}])/g;

export interface ParsedPayload {
  data: DataNode;
  type: ReturnType<typeof detectDatatype>;
  shape: number[];
  summary: string;
  issues: ParseIssue[];
}

export function parsePythonLike(rawInput: string, manualType: SupportedManualType = "auto"): ParsedPayload {
  if (!rawInput.trim()) {
    throw createParseError("Input is empty. Add a value like [1, 2, ['a', 0]].");
  }

  let normalized = rawInput.trim();
  const issues: ParseIssue[] = [];

  PYTHON_KEYWORDS.forEach(({ pattern, replacement, hint }) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, replacement);
      issues.push({ message: hint });
    }
  });

  const trailingCommaRegex = new RegExp(TRAILING_COMMA.source, TRAILING_COMMA.flags);
  if (trailingCommaRegex.test(normalized)) {
    normalized = normalized.replace(trailingCommaRegex, "$1");
    issues.push({
      message: "Removed trailing commas at the end of lists or objects.",
    });
  }

  const dictNormalization = normalizeDictConstructors(normalized);
  if (dictNormalization.changed) {
    normalized = dictNormalization.value;
    issues.push({
      message: "Converted Python dict(...) constructors to JSON objects.",
    });
  }

  try {
    const parsed = JSON5.parse(normalized);
    const safeValue = DataSchema.parse(parsed);

    const { type, shape } = determineTypeAndShape(safeValue, manualType);
    const summary = describeNode(safeValue, type, shape);

    return { data: safeValue, type, shape, summary, issues };
  } catch (error: unknown) {
    if (error instanceof ManualTypeMismatchError) {
      const manualIssue: ParseIssue = { message: error.message };
      if (error.hint) {
        manualIssue.hint = error.hint;
      }
      throw manualIssue;
    }

    if (isParseIssue(error)) {
      throw error;
    }

    if (error instanceof ZodError) {
      throw createParseError("Parsed value contains an unsupported type.", error);
    }

    if (error instanceof SyntaxError) {
      throw createParseError("Could not parse the input. Check brackets, commas, and quotes.", error);
    }

    throw createParseError("Unexpected error while parsing input.", error instanceof Error ? error : undefined);
  }
}

function determineTypeAndShape(data: DataNode, manualType: SupportedManualType) {
  const detectedType = detectDatatype(data);
  const baseShape = inferShape(data);

  if (manualType === "auto") {
    return { type: detectedType, shape: baseShape };
  }

  if (!Array.isArray(data)) {
    throw new ManualTypeMismatchError(
      `Manual type "${manualType}" requires the root value to be an array.`,
      "Wrap your data in square brackets, for example: [1, 2, 3]."
    );
  }

  switch (manualType) {
    case "array":
      return { type: "array" as const, shape: baseShape };
    case "matrix": {
      if (detectedType === "table") {
        throw new ManualTypeMismatchError(
          "Manual type \"matrix\" conflicts with tabular data.",
          "Use the table type hint or convert rows into nested arrays."
        );
      }
      if (baseShape.length !== 2) {
        throw new ManualTypeMismatchError(
          "Manual type \"matrix\" expects a 2D array with rows of equal length.",
          "Structure values like [[1, 2], [3, 4]]."
        );
      }
      return { type: "matrix" as const, shape: baseShape };
    }
    case "tensor": {
      if (baseShape.length < 3) {
        throw new ManualTypeMismatchError(
          "Manual type \"tensor\" expects three or more nested array dimensions.",
          "Structure values like [[[0, 1], [2, 3]], [[4, 5], [6, 7]]]."
        );
      }
      return { type: "tensor" as const, shape: baseShape };
    }
    case "table": {
      if (detectedType !== "table") {
        throw new ManualTypeMismatchError(
          "Manual type \"table\" requires an array of objects with identical keys.",
          "Each row should be an object, for example: [{ id: 1, name: 'Ada' }]."
        );
      }
      return {
        type: "table" as const,
        shape: baseShape,
      };
    }
    default:
      return { type: detectDatatype(data), shape: baseShape };
  }
}

function createParseError(message: string, cause?: Error): ParseIssue {
  const issue: ParseIssue = { message };
  if (cause?.message) {
    issue.hint = cause.message;
  }
  return issue;
}

interface DictNormalizationResult {
  value: string;
  changed: boolean;
}

function normalizeDictConstructors(source: string): DictNormalizationResult {
  let changed = false;
  let result = source;
  const dictPattern = /\bdict\s*\(/g;

  let match: RegExpExecArray | null;
  while ((match = dictPattern.exec(result)) !== null) {
    const start = match.index;
    const openParenIndex = dictPattern.lastIndex - 1;
    const closingIndex = findMatchingParen(result, openParenIndex);
    if (closingIndex === -1) {
      break;
    }

    const inner = result.slice(openParenIndex + 1, closingIndex);
    const normalizedArgs = normalizeDictArguments(inner);
    const replacement = `{${normalizedArgs}}`;

    result = `${result.slice(0, start)}${replacement}${result.slice(closingIndex + 1)}`;
    changed = true;
    dictPattern.lastIndex = 0;
  }

  return { value: result, changed };
}

function findMatchingParen(source: string, openIndex: number): number {
  let depth = 0;
  let quote: string | null = null;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (char === "\\" && index + 1 < source.length) {
        index += 1;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
      continue;
    }
  }
  return -1;
}

function normalizeDictArguments(inner: string): string {
  const parts = splitTopLevelArgs(inner);
  const normalized = parts
    .map((part) => {
      const match = part.match(/^([A-Za-z_][\w]*)\s*=\s*(.+)$/s);
      if (match) {
        const [, key, value] = match;
        return `${key}: ${value.trim()}`;
      }
      return part;
    })
    .filter((part) => part.length > 0);

  return normalized.join(", ");
}

function splitTopLevelArgs(inner: string): string[] {
  const parts: string[] = [];
  let current = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let quote: string | null = null;

  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];

    if (quote) {
      current += char;
      if (char === "\\" && index + 1 < inner.length) {
        // Preserve escape sequences inside strings.
        current += inner[index + 1];
        index += 1;
        continue;
      }

      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      current += char;
      continue;
    }

    if (char === "[") {
      bracketDepth += 1;
      current += char;
      continue;
    }

    if (char === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += char;
      continue;
    }

    if (char === "{") {
      braceDepth += 1;
      current += char;
      continue;
    }

    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      current += char;
      continue;
    }

    if (char === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      if (current.trim().length > 0) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    parts.push(current.trim());
  }

  return parts;
}

class ManualTypeMismatchError extends Error {
  hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "ManualTypeMismatchError";
    this.hint = hint;
  }
}

function isParseIssue(value: unknown): value is ParseIssue {
  return Boolean(value) && typeof value === "object" && value !== null && "message" in value;
}
