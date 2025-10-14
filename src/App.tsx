import { useEffect, useState } from "react";
import { InputPanel, type ExampleOption, type ManualTypeOption } from "./components/InputPanel";
import { DataVisualizer } from "./components/DataVisualizer";
import { SidePanel } from "./components/SidePanel";
import { parsePythonLike, type ParsedPayload } from "./lib/parser";
import type { ManualTypeValue, ParseIssue, SupportedManualType } from "./lib/types";
import { evaluateExpression, type ReplEvaluation, type ReplError } from "./lib/repl";

const EXAMPLES: ExampleOption[] = [
  {
    id: "auto-basics",
    label: "Auto detect",
    description: "Nested object with arrays",
    value: "{ team: 'viz', metrics: [0.92, 0.87], owner: { name: 'A. Dev', active: True } }",
    manualType: "auto",
  },
  {
    id: "array-flat",
    label: "Array",
    description: "Flat list of primitives",
    value: "[3, 1, 4, 1, 5, 9]",
    manualType: "array",
  },
  {
    id: "matrix",
    label: "Matrix",
    description: "2D array",
    value: "[[1, 2, 3], [4, 5, 6], [7, 8, 9]]",
    manualType: "matrix",
  },
  {
    id: "tensor",
    label: "Tensor",
    description: "3D list",
    value: "[[[0, 1], [2, 3]], [[4, 5], [6, 7]]]",
    manualType: "tensor",
  },
  {
    id: "table",
    label: "Table",
    description: "Consistent rows of objects",
    value: "[{ id: 101, name: 'Ada', active: True, score: 98 }, { id: 102, name: 'Linus', active: False, score: 91 }, { id: 103, name: 'Grace', active: True, score: 95 }]",
    manualType: "table",
  },
];

const MANUAL_TYPE_OPTIONS: ManualTypeOption[] = [
  { value: "auto", label: "Auto detect", description: "Let the parser infer the structure", supported: true },
  { value: "array", label: "Array", description: "1D list", supported: true },
  { value: "matrix", label: "Matrix", description: "2D grid of primitives", supported: true },
  { value: "tensor", label: "Tensor", description: "3D+ nested arrays", supported: true },
  { value: "table", label: "Table", description: "Rows of objects", supported: true },
  { value: "tree", label: "Tree", description: "Coming soon", supported: false },
  { value: "graph", label: "Graph", description: "Coming soon", supported: false },
  { value: "custom", label: "Custom", description: "Coming soon", supported: false },
];

const MANUAL_TYPE_OPTION_MAP = new Map<ManualTypeValue, ManualTypeOption>(
  MANUAL_TYPE_OPTIONS.map((option) => [option.value, option])
);

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "viz-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type ReplState = {
  evaluation?: ReplEvaluation;
  error?: ReplError;
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [rawInput, setRawInput] = useState(EXAMPLES[0]?.value ?? "[1, 2, ['a', 0]]");
  const [manualType, setManualType] = useState<SupportedManualType>(
    EXAMPLES[0]?.manualType ?? "auto"
  );
  const [parseResult, setParseResult] = useState<ParsedPayload | null>(null);
  const [parseError, setParseError] = useState<ParseIssue | undefined>();
  const [replState, setReplState] = useState<ReplState>();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-theme", theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(THEME_STORAGE_KEY)) {
        return;
      }
      setTheme(event.matches ? "dark" : "light");
    };
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const detectedType = parseResult?.type;

  const handleManualTypeChange = (next: ManualTypeValue) => {
    const option = MANUAL_TYPE_OPTION_MAP.get(next);
    if (option?.supported) {
      setManualType(next as SupportedManualType);
    }
  };

  const handleVisualize = () => {
    try {
      const result = parsePythonLike(rawInput, manualType);
      setParseResult(result);
      setParseError(undefined);
      setReplState(undefined);
    } catch (issue) {
      const parseIssue = normalizeIssue(issue);
      setParseError(parseIssue);
      setParseResult(null);
    }
  };

  const handleExampleSelect = (example: ExampleOption) => {
    setRawInput(example.value);
    setParseError(undefined);
    if (example.manualType) {
      handleManualTypeChange(example.manualType);
    }
  };

  const handleReplSubmit = (expression: string) => {
    if (!parseResult) {
      setReplState({ error: { message: "Visualize data first to explore it." } });
      return;
    }

    try {
      const evaluation = evaluateExpression(expression, parseResult.data);
      setReplState({ evaluation });
    } catch (error) {
      const replError = normalizeReplError(error);
      setReplState({ error: replError });
    }
  };

  const highlightPath = replState?.evaluation?.path;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Test Case Visualizer</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Paste a test case and inspect its structure visually.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-pressed={theme === "dark"}
              aria-label="Toggle color theme"
            >
              {theme === "dark" ? "Bright mode" : "Dark mode"}
            </button>
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              MVP preview
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <InputPanel
            value={rawInput}
            onValueChange={setRawInput}
            onVisualize={handleVisualize}
            isLoading={false}
            examples={EXAMPLES}
            onExampleSelect={handleExampleSelect}
            manualType={manualType}
            onManualTypeChange={handleManualTypeChange}
            manualTypeOptions={MANUAL_TYPE_OPTIONS}
            lastError={parseError}
          />

          <SidePanel
            detectedType={detectedType}
            shape={parseResult?.shape}
            summary={parseResult?.summary}
            issues={parseResult?.issues}
            manualType={manualType}
            canUseRepl={Boolean(parseResult)}
            onReplSubmit={handleReplSubmit}
            replResult={replState?.evaluation}
            replError={replState?.error}
          />
        </section>

        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Visualization</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Explore arrays, matrices, and nested objects. Collapse sections to focus on details.
              </p>
            </div>
          </header>

          <DataVisualizer
            data={parseResult?.data}
            highlightPath={highlightPath}
            detectedType={detectedType}
          />
        </section>
      </main>
    </div>
  );
}

function normalizeIssue(issue: unknown): ParseIssue {
  if (isParseIssue(issue)) {
    return issue;
  }
  if (issue instanceof Error) {
    return { message: issue.message };
  }
  return { message: "Unknown error while parsing input." };
}

function normalizeReplError(error: unknown): ReplError {
  if (isReplError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Unknown REPL error." };
}

function isParseIssue(value: unknown): value is ParseIssue {
  return Boolean(value) && typeof value === "object" && value !== null && "message" in value;
}

function isReplError(value: unknown): value is ReplError {
  return Boolean(value) && typeof value === "object" && value !== null && "message" in value;
}
