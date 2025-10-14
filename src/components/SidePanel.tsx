import { useState } from "react";
import type { DetectedDatatype, ManualTypeValue, ParseIssue, DataNode } from "../lib/types";
import type { ReplError, ReplEvaluation } from "../lib/repl";

export interface SidePanelProps {
  detectedType?: DetectedDatatype;
  shape?: number[];
  summary?: string;
  issues?: ParseIssue[];
  manualType?: ManualTypeValue;
  canUseRepl: boolean;
  onReplSubmit: (expression: string) => void;
  replResult?: ReplEvaluation;
  replError?: ReplError;
}

export function SidePanel({
  detectedType,
  shape,
  summary,
  issues = [],
  manualType,
  canUseRepl,
  onReplSubmit,
  replResult,
  replError,
}: SidePanelProps) {
  const [expression, setExpression] = useState("A");

  const shapeText = shape && shape.length > 0 ? `[${shape.join(" × ")}]` : "—";

  const handleSubmit = () => {
    onReplSubmit(expression);
  };

  return (
    <aside className="flex h-full flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 transition-colors dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-slate-950/30">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Insights</h2>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Detected metadata and REPL</p>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Summary</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm text-slate-600 transition-colors dark:text-slate-300">
          <dt className="text-slate-500 dark:text-slate-400">Type</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {detectedType ?? "—"}
            {manualType && manualType !== "auto" ? (
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                hint: {manualType}
              </span>
            ) : null}
          </dd>
          <dt className="text-slate-500 dark:text-slate-400">Shape</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">{shapeText}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Details</dt>
          <dd className="text-slate-700 dark:text-slate-200">{summary ?? "Visualize input to see details."}</dd>
        </dl>
      </section>

      {issues.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Parser hints</h3>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {issues.map((issue, index) => (
              <li
                key={`${issue.message}-${index}`}
                className="rounded-md bg-slate-100 px-2 py-1 transition-colors dark:bg-slate-800/60"
              >
                <span className="block font-medium text-slate-800 dark:text-slate-200">{issue.message}</span>
                {issue.hint ? (
                  <span className="text-slate-600 dark:text-slate-400">{issue.hint}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <header className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Quick REPL</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access nested values using bracket notation. Start with A, for example A[0] or A['key'].
          </p>
        </header>

        <div className="flex items-center gap-2">
          <input
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            placeholder="A[0]"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-accent focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
            disabled={!canUseRepl}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg border border-accent/30 bg-accent/90 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-accent"
            disabled={!canUseRepl}
          >
            Run
          </button>
        </div>

        {replError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 transition-colors dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {replError.message}
            {replError.hint ? (
              <span className="block text-red-500 dark:text-red-300">{replError.hint}</span>
            ) : null}
          </p>
        ) : null}

        {replResult ? (
          <ResultPanel result={replResult.result} path={replResult.path} />
        ) : null}
      </section>
    </aside>
  );
}

interface ResultPanelProps {
  result: DataNode | undefined;
  path: Array<string | number>;
}

function ResultPanel({ result, path }: ResultPanelProps) {
  const displayPath = path.length > 0 ? path.map(formatPathPart).join(" ⟶ ") : "root";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 transition-colors dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
      <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Focused Path</p>
      <p className="mb-3 font-mono text-slate-900 dark:text-slate-100">{displayPath}</p>
      <p className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Value</p>
      <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-white p-3 text-left font-mono text-[0.7rem] text-slate-800 transition-colors dark:bg-slate-950/80 dark:text-slate-100">
        {formatResult(result)}
      </pre>
    </div>
  );
}

function formatResult(value: DataNode | undefined): string {
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

function formatPathPart(part: string | number): string {
  return typeof part === "number" ? `[${part}]` : `['${part}']`;
}
