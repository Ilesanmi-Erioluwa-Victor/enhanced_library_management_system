import Badge from "../common/Badge.jsx";

export default function MemberCard({ member }) {
  if (!member) return null;
  return (
    <div className="card p-4 border-t-4 border-accent">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary-pale text-primary-dark flex items-center justify-center font-bold">
          {member.firstName?.[0]}{member.lastName?.[0]}
        </div>
        <div>
          <h3 className="font-semibold text-primary-dark">{member.firstName} {member.lastName}</h3>
          <p className="text-xs text-neutral-500">{member.memberID} • {member.memberType}</p>
        </div>
      </div>
      <div className="mt-3 text-sm text-neutral-700">
        <p>{member.email}</p>
        <p>{member.phone}</p>
      </div>
      <div className="mt-3">
        <Badge tone={member.isActive ? "success" : "danger"}>{member.isActive ? "Active" : "Inactive"}</Badge>
      </div>
    </div>
  );
}
