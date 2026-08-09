import type { Metadata } from "next";
import Link from "next/link";

import { BlameExplorer } from "@/app/_components/landing/blame-explorer";
import { PROBLEM_FILE } from "@/app/_components/landing/blame";
import {
  GraphMark,
  PointerMark,
  ScrubMark,
  Wordmark,
} from "@/app/_components/landing/marks";
import { Container, LinkButton, TextLink } from "@/app/_components/ui";

export const metadata: Metadata = {
  title: { absolute: "Cerebral — Every line of agent code, explained." },
  description:
    "git blame tells you an agent wrote it. Cerebral tells you why — the task, the prompt, the reasoning, the decisions.",
};

/**
 * The landing page.
 *
 * One idea carries the whole page: the blame gutter. It appears twice — in the
 * hero answering "why", and in the problem section failing to — and every other
 * piece of chrome here (line numbers, short hashes, the monospaced labels) is
 * borrowed from the same place, so the page speaks the language of the thing it
 * is selling. Everything else is the Linear system the app is already built
 * from, kept quiet on purpose.
 */
export default function LandingPage() {
  return (
    <div className="landing flex min-h-screen flex-col bg-app">
      <Header />
      <main className="flex-1">
        <Hero />
        <Problem />
        <ThreeThings />
        <HowItWorks />
        <WorksWith />
        <Also />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-app/80 backdrop-blur-md">
      <Container className="flex h-[56px] items-center justify-between gap-[16px]">
        <Wordmark />

        {/* The two section links fold away on a phone rather than crowding the
            two that actually lead somewhere. */}
        <nav className="hidden items-center gap-[20px] sm:flex">
          <TextLink href="#how-it-works" className="text-small text-fg-subtle">
            How it works
          </TextLink>
          <TextLink href="#works-with" className="text-small text-fg-subtle">
            Works with
          </TextLink>
        </nav>

        <div className="flex items-center gap-[8px]">
          <LinkButton href="/login" variant="tertiary" size="medium">
            Sign in
          </LinkButton>
          <LinkButton href="/register" variant="primary" size="medium">
            Get started
          </LinkButton>
        </div>
      </Container>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

/**
 * The load-in runs top to bottom in 90ms steps. Written as inline delays rather
 * than a stack of classes because the only thing that varies is the number.
 */
function enter(delay: number) {
  return { animationDelay: `${delay}ms` };
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* The brand light. `h-[560px]` keeps it behind the headline and off the
          panel, which has to stay legible as code. */}
      <div
        aria-hidden="true"
        className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[560px]"
      />

      <Container className="relative pt-[64px] pb-[72px] md:pt-[104px] md:pb-[80px]">
        <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
          <p
            className="landing-enter font-mono text-micro tracking-[0.08em] text-fg-subtle uppercase"
            style={enter(0)}
          >
            Provenance for agent-written code
          </p>

          <h1
            className="landing-enter mt-[18px] text-display font-medium text-balance text-fg md:text-hero"
            style={enter(90)}
          >
            Every line of agent code, explained.
          </h1>

          <p
            className="landing-enter mt-[18px] max-w-[560px] text-large text-pretty text-fg-subtle"
            style={enter(180)}
          >
            git blame tells you an agent wrote it. Cerebral tells you why — the
            task, the prompt, the reasoning, the decisions.
          </p>

          <div
            className="landing-enter mt-[28px] flex flex-wrap items-center justify-center gap-[10px]"
            style={enter(270)}
          >
            <LinkButton href="/register" variant="primary" size="large">
              Get started
            </LinkButton>
            <LinkButton href="#how-it-works" variant="secondary" size="large">
              How it works
            </LinkButton>
          </div>
        </div>

        {/* The product, not a picture of it. */}
        <div className="landing-enter mt-[48px] md:mt-[64px]" style={enter(380)}>
          <BlameExplorer />
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Problem
// ---------------------------------------------------------------------------

/**
 * A file from the same set as the hero's, blamed by git instead.
 *
 * Every row carries the identical label, which is the entire argument — so the
 * code is drained of colour and the list fades out rather than ending, leaving
 * the repetition as the only thing to look at. It is a different language from
 * the one the hero opens on, so the claim reads as "any file" rather than "that
 * file" even for someone who never touches the tabs.
 */
function Problem() {
  return (
    <section className="border-t border-line">
      <Container className="grid gap-[40px] py-[72px] md:py-[96px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center lg:gap-[64px]">
        <div className="landing-reveal overflow-hidden rounded-panel border border-line bg-surface-sunken">
          <div className="flex items-center justify-between gap-[12px] border-b border-line px-[14px] py-[9px]">
            <span className="truncate font-mono text-mini text-fg-faint">
              {PROBLEM_FILE.path}
              <span className="opacity-70"> · {PROBLEM_FILE.lang}</span>
            </span>
            <span className="shrink-0 font-mono text-micro tracking-[0.04em] text-fg-faint uppercase">
              git blame
            </span>
          </div>

          <div className="landing-fade-out overflow-hidden">
            <div className="min-w-max py-[6px]">
              {PROBLEM_FILE.code.map((row) => (
                <div key={row.n} className="flex items-stretch">
                  <span className="w-[152px] shrink-0 px-[12px] py-[2px] font-mono text-micro text-fg-faint">
                    agent · 4 days ago
                  </span>
                  <span className="w-[26px] shrink-0 py-[2px] pr-[12px] text-right font-mono text-micro text-fg-faint tabular-nums">
                    {row.n}
                  </span>
                  {/* Drained of syntax colour. In the hero these lines are lit;
                      here they are only there to be recognised. */}
                  <code className="py-[2px] pr-[16px] font-mono text-[12px] leading-[19px] whitespace-pre text-fg-faint/70">
                    {row.text || " "}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="landing-reveal">
          <p className="font-mono text-micro tracking-[0.08em] text-fg-faint uppercase">
            The problem
          </p>
          <p className="mt-[16px] text-title2 text-balance text-fg md:text-display">
            That&rsquo;s all blame gives you now.
          </p>
          <p className="mt-[14px] max-w-[420px] text-large text-pretty text-fg-subtle">
            Not what you asked for. Not what it tried first. Not why it landed
            here.
          </p>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Three things
// ---------------------------------------------------------------------------

const THINGS = [
  {
    mark: <PointerMark />,
    title: "Blame that answers “why”",
    body: "Click a line. See the task, the reasoning, and the decision behind it.",
  },
  {
    mark: <ScrubMark />,
    title: "Replayable history",
    body: "Every prompt, tool call, and diff — step by step, not just the end result.",
  },
  {
    mark: <GraphMark />,
    title: "Real git underneath",
    body: "Snapshots are real commits in your repo. Nothing proprietary. Delete Cerebral, keep your history.",
  },
];

function ThreeThings() {
  return (
    <section className="border-t border-line">
      <Container className="py-[72px] md:py-[104px]">
        <p className="landing-reveal font-mono text-micro tracking-[0.08em] text-fg-faint uppercase">
          Three things
        </p>

        <div className="mt-[24px] grid gap-[16px] md:grid-cols-3">
          {THINGS.map((thing) => (
            <div
              key={thing.title}
              className="landing-reveal flex flex-col rounded-panel border border-line bg-surface p-[20px] shadow-panel"
            >
              {/* The same tile the app's empty states put their glyph in. */}
              <span className="flex size-[32px] items-center justify-center rounded-panel bg-surface-hover text-fg-subtle">
                {thing.mark}
              </span>
              <h2 className="mt-[16px] text-normal font-medium text-fg">
                {thing.title}
              </h2>
              <p className="mt-[6px] text-small text-pretty text-fg-subtle">
                {thing.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------

const STEPS = [
  "Connect your repo.",
  "Your agent works. Cerebral records each step as a git snapshot.",
  "Open any file. Every line traces back to a decision.",
];

/**
 * The three steps hang off a commit spine rather than a numbered list, because
 * that is what they are: each step is a snapshot on the same branch, and the
 * hairline between the nodes is the branch.
 */
function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-[56px] border-t border-line">
      <Container className="grid gap-[40px] py-[72px] md:py-[104px] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-[64px]">
        <div className="landing-reveal">
          <p className="font-mono text-micro tracking-[0.08em] text-fg-faint uppercase">
            How it works
          </p>
          <h2 className="mt-[16px] text-title2 text-balance text-fg md:text-display">
            One hook, then it&rsquo;s just git.
          </h2>
        </div>

        <ol className="landing-reveal flex flex-col">
          {STEPS.map((step, i) => (
            <li key={step} className="relative pb-[28px] pl-[32px] last:pb-0">
              {/* The branch. Stops at the last node instead of running past it. */}
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-[18px] bottom-[-4px] left-[6px] w-px bg-line-strong"
                />
              ) : null}

              <span
                aria-hidden="true"
                className="absolute top-[5px] left-0 flex size-[13px] items-center justify-center rounded-full border border-line-strong bg-app"
              >
                <span className="size-[5px] rounded-full bg-brand-ring" />
              </span>

              <p className="text-large text-pretty text-fg-muted">{step}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Works with
// ---------------------------------------------------------------------------

function WorksWith() {
  return (
    <section id="works-with" className="scroll-mt-[56px] border-t border-line">
      <Container className="landing-reveal flex flex-col items-center gap-[16px] py-[56px] text-center md:py-[72px]">
        <p className="font-mono text-micro tracking-[0.08em] text-fg-faint uppercase">
          Works with
        </p>

        {/* Flat chips rather than the library's secondary button: these name
            what Cerebral hooks into, and nothing happens when you press them. */}
        <div className="flex flex-wrap items-center justify-center gap-[8px]">
          {["Claude Code", "Cursor"].map((tool) => (
            <span
              key={tool}
              className="rounded-control border border-line bg-surface px-[14px] py-[7px] text-small text-fg-muted"
            >
              {tool}
            </span>
          ))}
        </div>

        <p className="text-small text-fg-subtle">
          Hooks only. No workflow change.
        </p>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Also
// ---------------------------------------------------------------------------

const ALSO = [
  "Human and agent tasks in one place",
  "Approval and QA gates mid-run",
  "Local-first",
];

function Also() {
  return (
    <section className="border-t border-line">
      <Container className="landing-reveal py-[40px]">
        <p className="font-mono text-micro tracking-[0.08em] text-fg-faint uppercase">
          Also
        </p>
        <ul className="mt-[16px] grid gap-[16px] sm:grid-cols-3 sm:gap-0">
          {ALSO.map((item) => (
            <li
              key={item}
              className="text-small text-fg-subtle sm:border-l sm:border-line sm:px-[20px] sm:first:border-l-0 sm:first:pl-0"
            >
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Call to action
// ---------------------------------------------------------------------------

function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div
        aria-hidden="true"
        className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]"
      />

      <Container className="landing-reveal relative flex flex-col items-center gap-[24px] py-[96px] text-center md:py-[128px]">
        <h2 className="max-w-[680px] text-display font-medium text-balance text-fg md:text-hero">
          Stop guessing why the code looks like this.
        </h2>
        <LinkButton href="/register" variant="primary" size="large">
          Get started
        </LinkButton>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-[12px] py-[24px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-[12px]">
          <Wordmark />
          <span className="font-mono text-micro text-fg-faint">
            Developer preview
          </span>
        </div>

        <div className="flex items-center gap-[20px] text-small">
          <Link
            href="/projects"
            className="text-fg-subtle no-underline transition-colors duration-100 hover:text-fg"
          >
            Open the app
          </Link>
          <Link
            href="/login"
            className="text-fg-subtle no-underline transition-colors duration-100 hover:text-fg"
          >
            Sign in
          </Link>
        </div>
      </Container>
    </footer>
  );
}
