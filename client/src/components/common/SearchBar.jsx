import { useEffect, useState, useRef } from "react";
import { Input } from "./Input.jsx";

export default function SearchBar({ value, onChange, placeholder = "Search…", delay = 0 }) {
  const [local, setLocal] = useState(value || "");
  const onChangeRef = useRef(onChange);

  useEffect(() => { setLocal(value || ""); }, [value]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!delay) return;
    const t = setTimeout(() => onChangeRef.current?.(local), delay);
    return () => clearTimeout(t);
  }, [local, delay]);

  return (
    <div className="relative max-w-sm">
      <Input value={local} onChange={(e) => { setLocal(e.target.value); if (!delay) onChange?.(e.target.value); }} placeholder={placeholder} />
      <span className="absolute right-3 top-2.5 text-neutral-400 text-sm">🔍</span>
    </div>
  );
}
