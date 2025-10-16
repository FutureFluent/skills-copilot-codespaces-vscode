import { useEffect, useMemo, useState } from "react";

export interface EmissionFactor {
  id: string;
  category: string;
  name: string;
  scope: "upstream" | "downstream" | "onsite" | string;
  unit: string;
  year: number;
  region: string;
  value: number;
}

const DATA_URL = "/data/emission-factors.json";

type Summary = {
  total: number;
  categories: Array<{ name: string; count: number }>;
};

interface UseEmissionFactorsResult {
  data: EmissionFactor[];
  loading: boolean;
  error: string | null;
  summary: Summary;
}

export function useEmissionFactors(): UseEmissionFactorsResult {
  const [data, setData] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(DATA_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const body = (await response.json()) as EmissionFactor[];
        if (isMounted) {
          setData(body);
          setError(null);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const summary = useMemo<Summary>(() => {
    if (data.length === 0) {
      return { total: 0, categories: [] };
    }

    const byCategory = data.reduce<Record<string, number>>((accumulator, factor) => {
      accumulator[factor.category] = (accumulator[factor.category] ?? 0) + 1;
      return accumulator;
    }, {});

    return {
      total: data.length,
      categories: Object.entries(byCategory)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    };
  }, [data]);

  return { data, loading, error, summary };
}
