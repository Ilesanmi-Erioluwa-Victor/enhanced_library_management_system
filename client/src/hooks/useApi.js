import { useEffect, useState, useRef } from "react";

export default function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const aliveRef = useRef(true);
  const reqIdRef = useRef(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const myReq = ++reqIdRef.current;
    setLoading(true);
    fn()
      .then((d) => { if (myReq === reqIdRef.current && aliveRef.current) setData(d); })
      .catch((e) => { if (myReq === reqIdRef.current && aliveRef.current) setError(e); })
      .finally(() => {
        if (myReq === reqIdRef.current) inFlightRef.current = false;
        if (myReq === reqIdRef.current && aliveRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = () => {
    if (inFlightRef.current) return Promise.resolve(data);
    inFlightRef.current = true;
    const myReq = ++reqIdRef.current;
    setLoading(true);
    return fn()
      .then((d) => { if (myReq === reqIdRef.current && aliveRef.current) setData(d); return d; })
      .catch((e) => { if (myReq === reqIdRef.current && aliveRef.current) setError(e); throw e; })
      .finally(() => {
        if (myReq === reqIdRef.current) inFlightRef.current = false;
        if (myReq === reqIdRef.current && aliveRef.current) setLoading(false);
      });
  };

  return { data, loading, error, setData, refetch };
}
