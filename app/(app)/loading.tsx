/**
 * Shown while a view's data is in flight.
 *
 * Every navigation used to hold on the previous screen until the API answered,
 * with nothing to say it had been heard. This draws the shape of the list that
 * is coming — header rule, toolbar, rows — so the page arrives in place rather
 * than appearing all at once.
 *
 * `animate-pulse` is the only motion, and the reduced-motion rule in
 * `globals.css` stills it for anyone who has asked for that.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-1 flex-col">
      <span className="sr-only">Loading</span>

      <div className="h-[48px] shrink-0 border-b border-line" />
      <div className="h-[41px] shrink-0 border-b border-line" />

      <div className="mx-auto w-full max-w-[1120px] animate-pulse px-[20px] py-[20px]">
        <div className="h-[33px] w-[124px] rounded-control bg-surface-hover" />

        <div className="mt-[16px] overflow-hidden rounded-panel border border-line bg-surface">
          {/* Widths vary so the block reads as a list of titles rather than a
              stack of identical bars. */}
          {[62, 48, 71, 55, 66, 43, 58].map((width, index) => (
            <div
              key={index}
              className="flex items-center gap-[10px] border-b border-line px-[16px] py-[12px] last:border-b-0"
            >
              <span className="size-[14px] shrink-0 rounded-[2px] bg-surface-hover" />
              <span
                className="h-[10px] rounded-full bg-surface-hover"
                style={{ width: `${width}%` }}
              />
              <span className="ml-auto h-[10px] w-[56px] shrink-0 rounded-full bg-surface-hover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
