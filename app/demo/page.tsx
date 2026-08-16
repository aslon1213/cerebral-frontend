import type { Metadata } from "next";
import { connection } from "next/server";

import { Wordmark } from "@/app/_components/landing/marks";
import { Container, EmptyState, LinkButton } from "@/app/_components/ui";

export const metadata: Metadata = {
  title: "Demo",
  description: "Watch Cerebral trace a line of agent-written code back to the decision behind it.",
};

/**
 * The demo recording, served from wherever `DEMO_VIDEO_URL` points.
 *
 * The URL is read at request time rather than baked into a prerender: it is a
 * signed storage link that gets re-issued, and the point of keeping it in the
 * environment is that replacing it takes a restart, not a rebuild. `connection()`
 * is what holds the page out of the static pass — the route segment `dynamic`
 * flag is gone in this version of Next.
 */
export default async function DemoPage() {
  await connection();
  const src = process.env.DEMO_VIDEO_URL;

  return (
    <div className="landing flex min-h-screen flex-col bg-app">
      <header className="border-b border-line">
        <Container className="flex h-[56px] items-center justify-between gap-[16px]">
          <Wordmark />
          <LinkButton href="/register" variant="primary" size="medium">
            Get started
          </LinkButton>
        </Container>
      </header>

      <main className="relative flex-1 overflow-hidden">
        {/* The same brand light the landing hero sits under. */}
        <div
          aria-hidden="true"
          className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        />

        <Container className="relative pt-[48px] pb-[72px] md:pt-[72px]">
          <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
            <p className="font-mono text-micro tracking-[0.08em] text-fg-subtle uppercase">
              Demo
            </p>
          </div>

          {/* The player is capped by the height left under the header as well as
              by the measure, so a 16:9 frame lands whole on a laptop instead of
              running off the fold and hiding its own controls. It matters more
              now that the video starts on its own: what plays unprompted has to
              be fully in view. */}
          <div className="mx-auto mt-[40px] w-full max-w-[min(1120px,calc((100vh-240px)*16/9))]">
            {src ? (
              // 16:9 because that is what the recording is (1920×1080). The
              // black fill is the letterbox while the first frame loads, so the
              // panel never flashes the page background at video size.
              <video
                src={src}
                autoPlay
                // Muted is not a preference, it is the price of autoplay:
                // every browser blocks an unprompted play with sound. The
                // controls are there for whoever wants the audio back.
                muted
                controls
                playsInline
                preload="auto"
                className="aspect-video w-full rounded-panel border border-line bg-black shadow-panel"
              >
                Your browser cannot play this video.{" "}
                <a href={src}>Download it instead.</a>
              </video>
            ) : (
              <EmptyState
                title="No demo video configured"
                action={
                  <LinkButton href="/" variant="secondary" size="medium">
                    Back to the homepage
                  </LinkButton>
                }
              >
                Set <code className="font-mono text-mini text-fg-muted">DEMO_VIDEO_URL</code>{" "}
                in the environment to the recording&rsquo;s address, then restart
                the server.
              </EmptyState>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
