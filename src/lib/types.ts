export type Primitive = string | number | boolean | null;
export type DataNode = Primitive | DataArray | DataObject;
export type DataArray = DataNode[];
export type DataObject = { [key: string]: DataNode };

export type ManualTypeValue =
  | "auto"
  | "array"
  | "matrix"
  | "tensor"
  | "table"
  | "tree"
  | "graph"
  | "custom";

export type SupportedManualType = Exclude<ManualTypeValue, "tree" | "graph" | "custom">;

export type DetectedDatatype =
  | "array"
  | "matrix"
  | "tensor"
  | "table"
  | "object"
  | "primitive"
  | "unknown";

export interface ParsedResult {
  root: DataNode;
  type: DetectedDatatype;
  shape: number[];
  summary: string;
}

export interface ParseIssue {
  message: string;
  hint?: string;
}
