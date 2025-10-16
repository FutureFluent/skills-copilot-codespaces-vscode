import { Link } from "react-router-dom";
import { useEmissionFactors } from "@/hooks/useEmissionFactors";

const DashboardView = () => {
  const { data, loading, error, summary } = useEmissionFactors();

  if (loading) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Loading the latest emission factor dataset. This may take a moment.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Fetching data…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Something went wrong while retrieving the emission factors.
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <p className="mt-2 text-xs text-red-600">
            Ensure the JSON file is available in <code>public/data/emission-factors.json</code>.
          </p>
        </div>
      </section>
    );
  }

  const topCategory = summary.categories[0];

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Overview</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          A quick snapshot of the emission factor library available to power dashboards and analytics
          across the organisation.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total emission factors
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.total.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Sourced from the current dataset.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {summary.categories.length.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Grouped by activity type and ready for analysis.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Most populated category
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {topCategory ? topCategory.name : "Not available"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {topCategory ? `${topCategory.count} factors` : "Awaiting dataset"}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recently updated factors</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sample entries loaded from the JSON data to confirm the integration is working.
          </p>
        </header>
        <div className="px-6 py-4">
          <ul className="divide-y divide-slate-100">
            {data.slice(0, 5).map((factor) => (
              <li key={factor.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{factor.name}</p>
                  <p className="text-xs text-slate-500">
                    {factor.category} · {factor.region} · {factor.year}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {factor.value} <span className="text-xs font-medium text-slate-500">{factor.unit}</span>
                  </p>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    Scope: {factor.scope}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <Link
              to="/factors"
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-dark"
            >
              View full library
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
};

export default DashboardView;
