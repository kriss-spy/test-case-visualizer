import type { ChangeEvent } from "react";
import type { ManualTypeValue, ParseIssue, SupportedManualType } from "../lib/types";

export interface ExampleOption {
  id: string;
  label: string;
  description: string;
  value: string;
  manualType?: SupportedManualType;
}

export interface ManualTypeOption {
  value: ManualTypeValue;
  label: string;
  description?: string;
  supported: boolean;
}

export interface InputPanelProps {
  value: string;
  onValueChange: (next: string) => void;
  onVisualize: () => void;
  isLoading?: boolean;
  examples: ExampleOption[];
  onExampleSelect: (example: ExampleOption) => void;
  manualType: SupportedManualType;
  onManualTypeChange: (type: ManualTypeValue) => void;
  manualTypeOptions: ManualTypeOption[];
  lastError?: ParseIssue;
}

export function InputPanel({
  value,
  onValueChange,
  onVisualize,
  isLoading = false,
  examples,
  onExampleSelect,
  manualType,
  onManualTypeChange,
  manualTypeOptions,
  lastError,
}: InputPanelProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(event.target.value);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 transition-colors dark:border-slate-800 dark:bg-surface-muted/80 dark:shadow-slate-950/40">
      <header className="mb-4 space-y-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Welcome</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Paste a Python-like test case or pick a ready-made sample. When you are ready, hit Visualize to see the structure.
        </p>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">Manual type hint</span>
          <select
            value={manualType}
            onChange={(event) => onManualTypeChange(event.target.value as ManualTypeValue)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-accent focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
          >
            {manualTypeOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={!option.supported}
                aria-disabled={!option.supported}
                className={!option.supported ? "text-slate-400 dark:text-slate-600" : undefined}
                style={!option.supported ? { color: "#94a3b8" } : undefined}
                title={option.description}
              >
                {option.label}
                {option.description ? ` - ${option.description}` : ""}
                {!option.supported ? " (soon)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">Quick samples</span>
          <select
            onChange={(event) => {
              const example = examples.find((item) => item.id === event.target.value);
              if (example) {
                onExampleSelect(example);
              }
            }}
            defaultValue=""
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-accent focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
          >
            <option value="" disabled>
              Choose an example…
            </option>
            {examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        value={value}
        onChange={handleChange}
        rows={10}
        spellCheck={false}
        className="h-56 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-4 font-mono text-sm text-slate-900 shadow-inner shadow-slate-200 focus:border-accent focus:outline-none dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:shadow-black/40"
        placeholder="Example: [1, 2, ['a', 0]]"
      />

      {lastError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition-colors dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {lastError.message}
          {lastError.hint ? (
            <span className="block text-xs text-red-500 dark:text-red-300">{lastError.hint}</span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onVisualize}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Visualizing…" : "Visualize"}
        </button>
      </div>
    </div>
  );
}
