type ReturnRow = { status: string; createdAt: string };
type ExchangeRow = { status: string; createdAt: string };

export function OrderReturnExchangeTimeline({
  returns,
  exchanges
}: {
  returns: ReturnRow[];
  exchanges: ExchangeRow[];
}) {
  if (returns.length === 0 && exchanges.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">Returns & exchanges</h2>
      <p className="mt-1 text-xs text-zinc-500">Status updates as the team processes your request.</p>
      {returns.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {returns.map((r, i) => (
            <li key={`r-${i}`} className="flex justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
              <span className="font-medium text-zinc-800">Return</span>
              <span className="shrink-0 text-xs uppercase text-zinc-500">{r.status}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {exchanges.length > 0 ? (
        <ul className={`space-y-2 text-sm ${returns.length ? "mt-3" : "mt-4"}`}>
          {exchanges.map((r, i) => (
            <li key={`x-${i}`} className="flex justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2">
              <span className="font-medium text-zinc-800">Exchange</span>
              <span className="shrink-0 text-xs uppercase text-zinc-500">{r.status}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
