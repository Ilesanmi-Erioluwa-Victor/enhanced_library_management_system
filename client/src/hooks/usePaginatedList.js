import { useEffect, useState, useCallback, useRef } from "react";
import { PAGE_SIZE } from "../utils/constants";

export default function usePaginatedList(fetcher, initialParams = {}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(() => ({ limit: PAGE_SIZE, ...initialParams }));

  const reqId = useRef(0);
  const inFlight = useRef(false);
  const mountedRef = useRef(true);
  const paramsRef = useRef(params);
  const pageRef = useRef(page);
  const fetcherRef = useRef(fetcher);

  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (p, pr) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const myReq = ++reqId.current;
    const usePage = p ?? pageRef.current;
    const useParams = pr ?? paramsRef.current;
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetcherRef.current({ page: usePage, ...useParams });
      if (myReq !== reqId.current || !mountedRef.current) return;
      if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
        setPages(1);
      } else {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      }
    } catch (e) {
      if (myReq !== reqId.current || !mountedRef.current) return;
      setError(e);
      setItems([]);
    } finally {
      if (myReq === reqId.current) inFlight.current = false;
      if (myReq === reqId.current && mountedRef.current) setLoading(false);
    }
  }, []);

  const initialRan = useRef(false);
  useEffect(() => {
    if (initialRan.current) return;
    initialRan.current = true;
    load(1, paramsRef.current);
  }, [load]);

  const applyQuery = useCallback((newParams) => {
    const prev = paramsRef.current;
    const next = typeof newParams === "function" ? newParams(prev) : { ...prev, ...newParams };
    paramsRef.current = next;
    setParams(next);
    setPage(1);
    pageRef.current = 1;
    load(1, next);
  }, [load]);

  const goToPage = useCallback((p) => {
    setPage(p);
    pageRef.current = p;
    load(p);
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { items, total, pages, page, loading, error, params, setQuery: applyQuery, goToPage, refresh };
}
