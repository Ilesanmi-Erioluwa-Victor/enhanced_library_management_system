export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md card p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">Library Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Delta State Polytechnic, Otefe-Oghara</p>
        </div>
        {children}
      </div>
    </div>
  );
}
