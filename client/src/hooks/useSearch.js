import { useEffect, useState } from "react";
import { SEARCH_DEBOUNCE_MS } from "../utils/constants";

export default function useSearch(initial = "", delay = SEARCH_DEBOUNCE_MS) {
  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), delay);
    return () => clearTimeout(t);
  }, [query, delay]);

  return { query, setQuery, debounced };
}
