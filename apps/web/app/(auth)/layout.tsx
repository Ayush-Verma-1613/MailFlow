export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // The 50/50 editorial split lives in AuthShell (rendered per page).
  return <div className="bg-canvas min-h-svh">{children}</div>;
}
