export default function Table({ columns, rows, empty = "No data" }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        <thead className="table-header">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-2 text-left font-semibold whitespace-nowrap">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white">
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-neutral-500">{empty}</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r._id || r.id || i} className="hover:bg-neutral-50">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-2 align-middle">
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
