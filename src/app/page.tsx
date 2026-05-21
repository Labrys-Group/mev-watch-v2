import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="terminal-grid min-h-screen">
      <header className="flex items-center justify-between border-b border-border-labrys px-6 py-4">
        <div className="font-mono text-sm tracking-wide">
          <span className="font-bold">MEVWATCH</span>{" "}
          <span className="text-fg-muted">// MONITOR</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-brand">
          // Public Transparency Tool
        </p>
        <h1 className="mt-4 font-sans text-5xl font-extrabold tracking-tight">
          MEV Watch v2
        </h1>
        <p className="mt-4 max-w-md font-mono text-sm text-fg-muted">
          Foundation online. Data pipeline and dashboard arrive in the next
          phases.
        </p>
      </section>
    </main>
  );
}
