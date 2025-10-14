import { useMemo, useState } from "react";
import type { DataNode, DataObject, DetectedDatatype } from "../lib/types";
import { analyzeTable, isTableData } from "../lib/shape";

export interface DataVisualizerProps {
  data?: DataNode;
  highlightPath?: Array<string | number>;
  detectedType?: DetectedDatatype;
}

export function DataVisualizer({ data, highlightPath, detectedType }: DataVisualizerProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const highlightKey = useMemo(() => (highlightPath ? pathToKey(highlightPath) : undefined), [
    highlightPath,
  ]);

  const toggle = (path: Array<string | number>) => {
    const key = pathToKey(path);
  setCollapsed((previous: Set<string>) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (data === undefined) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-10 text-center text-sm text-slate-500 transition-colors dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
        Visualize a test case to see it rendered here.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-inner shadow-slate-200 transition-colors dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/40">
      <NodeRenderer
        node={data}
        path={[]}
        collapsed={collapsed}
        toggle={toggle}
        highlightKey={highlightKey}
        detectedType={detectedType}
      />
    </div>
  );
}

interface NodeRendererProps {
  node: DataNode;
  path: Array<string | number>;
  collapsed: Set<string>;
  toggle: (path: Array<string | number>) => void;
  highlightKey?: string;
  detectedType?: DetectedDatatype;
}

function NodeRenderer({ node, path, collapsed, toggle, highlightKey, detectedType }: NodeRendererProps) {
  if (Array.isArray(node)) {
    if (isTableData(node) || detectedType === "table") {
      return (
        <TableNode
          rows={node as DataObject[]}
          path={path}
          collapsed={collapsed}
          toggle={toggle}
          highlightKey={highlightKey}
          detectedType={detectedType}
        />
      );
    }
    return (
      <ArrayNode
        items={node}
        path={path}
        collapsed={collapsed}
        toggle={toggle}
        highlightKey={highlightKey}
        detectedType={detectedType}
      />
    );
  }

  if (isPlainObject(node)) {
    return (
      <ObjectNode
        value={node}
        path={path}
        collapsed={collapsed}
        toggle={toggle}
        highlightKey={highlightKey}
        detectedType={detectedType}
      />
    );
  }

  return <PrimitiveNode value={node} highlight={pathToKey(path) === highlightKey} />;
}

interface ArrayNodeProps {
  items: DataNode[];
  path: Array<string | number>;
  collapsed: Set<string>;
  toggle: (path: Array<string | number>) => void;
  highlightKey?: string;
  detectedType?: DetectedDatatype;
}

function ArrayNode({ items, path, collapsed, toggle, highlightKey, detectedType }: ArrayNodeProps) {
  const key = pathToKey(path);
  const isCollapsed = collapsed.has(key);
  const hasChildren = items.some((item) => isContainer(item));

  // Render 2D arrays as a simple grid when each row is an array of equal length.
  const matrixRows = items.every(Array.isArray) ? (items as DataNode[][]) : [];
  const isMatrix =
    matrixRows.length > 0 &&
    sameLength(matrixRows) &&
    matrixRows.every((row) => (row as DataNode[]).every(isPrimitiveNode));
  const isHighlighted = highlightKey === key;
  const columnCount = isMatrix ? Math.max(1, (items[0] as DataNode[]).length) : 0;
  const shouldScroll = isMatrix && items.length > 40;
  const allPrimitives = items.every(isPrimitiveNode);
  const hasNestedContainers = items.some((item) => isContainer(item));

  return (
    <div
      className={`space-y-3 rounded-xl border border-slate-200 bg-slate-100 p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/60 ${
        isHighlighted
          ? "ring-2 ring-offset-2 ring-accent/70 ring-offset-white dark:ring-offset-slate-950"
          : ""
      }`}
    >
      <header className="flex items-center gap-3">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggle(path)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-xs font-semibold text-accent transition hover:border-accent/60 dark:border-slate-700 dark:bg-slate-950/70"
          >
            {isCollapsed ? "+" : "−"}
          </button>
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-sm text-slate-400 dark:text-slate-500">
            ·
          </span>
        )}
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Array <span className="text-slate-500 dark:text-slate-400">({items.length} items)</span>
        </p>
      </header>

      {!isCollapsed ? (
        isMatrix ? (
          <div
            className={`rounded-lg border border-slate-200 bg-white p-3 transition-colors dark:border-slate-800 dark:bg-slate-950/60 ${
              shouldScroll ? "max-h-[32rem] overflow-auto" : "overflow-visible"
            } flex justify-center`}
          >
            <div
              className="inline-grid gap-[3px] text-xs text-slate-800 dark:text-slate-100"
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(3rem, 4.5rem))`,
              }}
            >
              {(items as DataNode[][]).map((row, rowIndex) =>
                row.map((cell, columnIndex) => (
                  <div
                    key={`${key}-cell-${rowIndex}-${columnIndex}`}
                    className="flex items-center justify-center rounded border border-slate-200 bg-slate-100 transition-colors dark:border-slate-800/70 dark:bg-slate-950/70"
                    style={{
                      aspectRatio: "1 / 1",
                      minWidth: "3rem",
                    }}
                  >
                    <NodeRenderer
                      node={cell}
                      path={[...path, rowIndex, columnIndex]}
                      collapsed={collapsed}
                      toggle={toggle}
                      highlightKey={highlightKey}
                      detectedType={detectedType}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : allPrimitives ? (
          <div
            className="mx-auto grid w-full max-w-3xl justify-items-center gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(4.5rem, 1fr))",
            }}
          >
            {items.map((item, index) => (
              <div
                key={`${key}-${index}`}
                className="flex aspect-square w-full max-w-[6rem] items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-sm font-medium text-slate-800 transition-colors dark:border-slate-800/60 dark:bg-slate-950/70 dark:text-slate-100"
              >
                <NodeRenderer
                  node={item}
                  path={[...path, index]}
                  collapsed={collapsed}
                  toggle={toggle}
                  highlightKey={highlightKey}
                  detectedType={detectedType}
                />
              </div>
            ))}
          </div>
        ) : hasNestedContainers ? (
          <div className="flex flex-col gap-4">
            {items.map((item, index) => (
              <div
                key={`${key}-${index}`}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-inner shadow-slate-200 transition-colors dark:border-slate-800/60 dark:bg-slate-950/60 dark:shadow-black/20"
              >
                <div className="mb-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">[{index}]</div>
                <NodeRenderer
                  node={item}
                  path={[...path, index]}
                  collapsed={collapsed}
                  toggle={toggle}
                  highlightKey={highlightKey}
                  detectedType={detectedType}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
            }}
          >
            {items.map((item, index) => (
              <div
                key={`${key}-${index}`}
                className="rounded-lg bg-slate-50 p-3 shadow-inner shadow-slate-200 transition-colors dark:bg-slate-950/60 dark:shadow-black/20"
              >
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">[{index}]</div>
                <NodeRenderer
                  node={item}
                  path={[...path, index]}
                  collapsed={collapsed}
                  toggle={toggle}
                  highlightKey={highlightKey}
                  detectedType={detectedType}
                />
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

interface ObjectNodeProps {
  value: Record<string, DataNode>;
  path: Array<string | number>;
  collapsed: Set<string>;
  toggle: (path: Array<string | number>) => void;
  highlightKey?: string;
  detectedType?: DetectedDatatype;
}

function ObjectNode({ value, path, collapsed, toggle, highlightKey, detectedType }: ObjectNodeProps) {
  const key = pathToKey(path);
  const isCollapsed = collapsed.has(key);
  const entries = Object.entries(value);
  const isHighlighted = highlightKey === key;

  return (
    <div
      className={`space-y-3 rounded-xl border border-slate-200 bg-slate-100 p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/60 ${
        isHighlighted
          ? "ring-2 ring-offset-2 ring-accent/70 ring-offset-white dark:ring-offset-slate-950"
          : ""
      }`}
    >
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => toggle(path)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-xs font-semibold text-accent transition hover:border-accent/60 dark:border-slate-700 dark:bg-slate-950/70"
        >
          {isCollapsed ? "+" : "−"}
        </button>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Object <span className="text-slate-500 dark:text-slate-400">({entries.length} keys)</span>
        </p>
      </header>

      {!isCollapsed ? (
        <div className="space-y-3">
          {entries.map(([entryKey, entryValue]) => (
            <div
              key={`${key}-${entryKey}`}
              className="rounded-lg bg-slate-50 p-3 transition-colors dark:bg-slate-950/60"
            >
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-600 dark:text-slate-500">
                ['{entryKey}']
              </div>
              <NodeRenderer
                node={entryValue}
                path={[...path, entryKey]}
                collapsed={collapsed}
                toggle={toggle}
                highlightKey={highlightKey}
                detectedType={detectedType}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface TableNodeProps {
  rows: DataObject[];
  path: Array<string | number>;
  collapsed: Set<string>;
  toggle: (path: Array<string | number>) => void;
  highlightKey?: string;
  detectedType?: DetectedDatatype;
}

function TableNode({ rows, path, collapsed, toggle, highlightKey, detectedType }: TableNodeProps) {
  const key = pathToKey(path);
  const isCollapsed = collapsed.has(key);
  const metadata = analyzeTable(rows);
  const isHighlighted = highlightKey === key;

  if (!metadata) {
    return (
      <ArrayNode
        items={rows}
        path={path}
        collapsed={collapsed}
        toggle={toggle}
        highlightKey={highlightKey}
        detectedType={detectedType}
      />
    );
  }

  const { headers } = metadata;

  return (
    <div
      className={`space-y-3 rounded-xl border border-slate-200 bg-slate-100 p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/60 ${
        isHighlighted
          ? "ring-2 ring-offset-2 ring-accent/70 ring-offset-white dark:ring-offset-slate-950"
          : ""
      }`}
    >
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => toggle(path)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-xs font-semibold text-accent transition hover:border-accent/60 dark:border-slate-700 dark:bg-slate-950/70"
        >
          {isCollapsed ? "+" : "−"}
        </button>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Table <span className="text-slate-500 dark:text-slate-400">({rows.length} rows)</span>
        </p>
      </header>

      {!isCollapsed ? (
        <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-200 transition-colors dark:border-slate-800/70">
          <table className="min-w-full border-collapse text-xs text-slate-800 transition-colors dark:text-slate-100">
            <thead className="bg-slate-100 text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <tr>
                {headers.map((header) => (
                  <th
                    key={`${key}-header-${header}`}
                    className="border-b border-slate-200 px-3 py-2 text-left font-semibold uppercase tracking-wide dark:border-slate-800"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const rowPath = [...path, rowIndex];
                const rowKey = pathToKey(rowPath);
                const isRowHighlighted = rowKey === highlightKey;
                return (
                  <tr
                    key={`${key}-row-${rowIndex}`}
                    className={`odd:bg-white even:bg-slate-50 transition-colors dark:odd:bg-slate-950/60 dark:even:bg-slate-950/40 ${
                      isRowHighlighted ? "bg-accent/10" : ""
                    }`}
                  >
                    {headers.map((header) => {
                    const cellPath = [...path, rowIndex, header];
                    const cellKey = pathToKey(cellPath);
                    const cellValue = row[header];
                    const isCellHighlighted = cellKey === highlightKey;
                    return (
                      <td
                        key={`${cellKey}`}
                        className={`border border-slate-200 px-3 py-2 align-top transition-colors dark:border-slate-800/60 ${
                          isCellHighlighted ? "bg-accent/20" : ""
                        }`}
                      >
                        <NodeRenderer
                          node={cellValue}
                          path={cellPath}
                          collapsed={collapsed}
                          toggle={toggle}
                          highlightKey={highlightKey}
                            detectedType={detectedType}
                        />
                      </td>
                    );
                  })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

interface PrimitiveNodeProps {
  value: DataNode;
  highlight?: boolean;
}

function PrimitiveNode({ value, highlight = false }: PrimitiveNodeProps) {
  return (
    <code
      className={`inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 transition-colors dark:bg-slate-950/60 dark:text-accent-soft ${
        highlight
          ? "ring-2 ring-offset-2 ring-accent/80 ring-offset-white dark:ring-offset-slate-950"
          : ""
      }`}
    >
      {formatPrimitive(value)}
    </code>
  );
}

function pathToKey(path: Array<string | number>): string {
  if (path.length === 0) {
    return "root";
  }
  return ["root", ...path.map((segment) => (typeof segment === "number" ? `#${segment}` : segment))].join("/");
}

function isPlainObject(value: unknown): value is Record<string, DataNode> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isContainer(node: DataNode): boolean {
  return Array.isArray(node) || isPlainObject(node);
}

function isPrimitiveNode(node: DataNode): boolean {
  return !isContainer(node);
}

function sameLength(a: DataNode[][]): boolean {
  const first = Array.isArray(a[0]) ? (a[0] as DataNode[]).length : undefined;
  if (typeof first !== "number") {
    return false;
  }
  return a.every((row) => Array.isArray(row) && (row as DataNode[]).length === first);
}

function formatPrimitive(value: DataNode): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (isPlainObject(value)) {
    return `Object(${Object.keys(value).length})`;
  }
  return String(value);
}
