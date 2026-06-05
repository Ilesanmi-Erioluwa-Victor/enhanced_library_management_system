import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { lookupMemberByEmail, getMember } from "../api/members.api";
import { useAuth } from "../hooks/useAuth";

const cache = new Map();

export default function useMemberProfile() {
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = async () => {
    if (!user?.email) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const m = await lookupMemberByEmail(user.email);
      const detail = await getMember(m._id);
      setMember(detail.member);
      setStats(detail.stats);
      cache.set(user.email, { member: detail.member, stats: detail.stats });
    } catch (e) {
      setError(e);
      toast.error(e?.response?.data?.message || "No member record linked to this account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = cache.get(user?.email);
    if (cached) {
      setMember(cached.member);
      setStats(cached.stats);
      setLoading(false);
    }
    if (user?.email) reload(); // eslint-disable-next-line
  }, [user?.email]);

  return { member, stats, loading, error, reload, setMember };
}
