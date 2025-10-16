import { useMemo, useState } from "react";
import { useEmissionFactors } from "@/hooks/useEmissionFactors";

const PAGE_SIZE = 10;

const FactorsView = () => {
  const { data, loading, error } = useEmissionFactors();
  const [page, setPage] = useState(0);

  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return data.slice(start, end);
  }, [data, page]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(next, 0), totalPages - 1));
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900">Factor Library</h1>
          <p className="mt-2 text-sm text-slate-600">Fetching emission factor records…</p>
        </header>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Loading data…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900">Factor Library</h1>
          <p className="mt-2 text-sm text-slate-600">The dataset could not be loaded.</p>
        </header>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Factor Library</h1>
        <p className="text-sm text-slate-600">
          Explore the full dataset loaded from <code>public/data/emission-factors.json</code>.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Identifier</th>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Region</th>
                <th scope="col" className="px-4 py-3">Year</th>
                <th scope="col" className="px-4 py-3">Value</th>
                <th scope="col" className="px-4 py-3">Unit</th>
                <th scope="col" className="px-4 py-3">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {paginated.map((factor) => (
                <tr key={factor.id} className="odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{factor.id}</td>
                  <td className="px-4 py-3">{factor.name}</td>
                  <td className="px-4 py-3">{factor.category}</td>
                  <td className="px-4 py-3">{factor.region}</td>
                  <td className="px-4 py-3">{factor.year}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{factor.value}</td>
                  <td className="px-4 py-3">{factor.unit}</td>
                  <td className="px-4 py-3 capitalize">{factor.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p>
            Showing {paginated.length} of {data.length} factors
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              className="rounded-md border border-slate-300 px-3 py-1 font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page + 1 >= totalPages}
              className="rounded-md border border-slate-300 px-3 py-1 font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default FactorsView;
