import {useEffect, useState} from 'react';
import {
  searchCatalogLocal,
  type CatalogSearchHit,
} from '../services/productSearchIndex';

const DEBOUNCE_MS = 200;

export function useDebouncedCatalogSearch(query: string, page = 0) {
  const [results, setResults] = useState<CatalogSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return undefined;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      void searchCatalogLocal(q, page)
        .then(setResults)
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, page]);

  return {results, loading};
}
