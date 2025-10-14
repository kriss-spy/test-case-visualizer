import JSON5 from "json5";
import type { DataNode } from "./types";

export interface ReplEvaluation {
  result: DataNode | undefined;
  path: Array<string | number>;
}

export interface ReplError {
  message: string;
  hint?: string;
}

const ROOT_IDENTIFIERS = new Set(["A", "data", "root"]);

export function evaluateExpression(expression: string, root: DataNode): ReplEvaluation {
  const trimmed = expression.trim();
  if (!trimmed) {
    throw createReplError("Expression is empty. Start with A to reference the parsed value.");
  }

  const rootMatch = trimmed.match(/^([A-Za-z_][\w]*)/);
  if (!rootMatch) {
    throw createReplError("Expression must start with an identifier like A.");
  }

  const identifier = rootMatch[1];
  if (!ROOT_IDENTIFIERS.has(identifier)) {
    throw createReplError(`Unknown root identifier '${identifier}'. Use A to reference the input.`);
  }

  let current: DataNode | undefined = root;
  const accessors = extractAccessors(trimmed.slice(identifier.length));
  const path: Array<string | number> = [];

  for (const accessor of accessors) {
    if (Array.isArray(current)) {
      if (typeof accessor !== "number") {
        throw createReplError(`Expected a numeric index for arrays, got '${String(accessor)}'.`);
      }
      current = current[accessor];
      path.push(accessor);
      if (current === undefined) {
        throw createReplError(`Index ${accessor} is out of range.`);
      }
      continue;
    }

    if (isPlainObject(current)) {
      if (typeof accessor !== "string") {
        throw createReplError(`Expected a string key to access object properties.`);
      }
      current = current[accessor];
      path.push(accessor);
      if (current === undefined) {
        throw createReplError(`Key '${accessor}' does not exist.`);
      }
      continue;
    }

    throw createReplError(`Cannot navigate deeper from primitive value '${String(current)}'.`);
  }

  return { result: current, path };
}

function extractAccessors(tail: string): Array<string | number> {
  const accessors: Array<string | number> = [];
  const regex = /\[(.*?)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(tail)) !== null) {
    const raw = match[1].trim();
    if (!raw) {
      throw createReplError("Empty accessor [] is not allowed.");
    }

    if (/^-?\d+$/.test(raw)) {
      accessors.push(Number.parseInt(raw, 10));
      continue;
    }

    try {
      const parsed = JSON5.parse(raw);
      if (typeof parsed === "string") {
        accessors.push(parsed);
        continue;
      }
    } catch (error) {
      throw createReplError("Could not parse accessor.", error instanceof Error ? error.message : undefined);
    }

    throw createReplError(`Unsupported accessor '${raw}'. Use numbers or quoted strings.`);
  }

  if (accessors.length === 0 && tail.trim()) {
    throw createReplError("Use square brackets like A[0] or A['key'] to access nested values.");
  }

  return accessors;
}

function createReplError(message: string, hint?: string): ReplError {
  return { message, hint };
}

function isPlainObject(value: unknown): value is Record<string, DataNode> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
