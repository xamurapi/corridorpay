import { AdminSidebar } from '@/components/admin/Sidebar';
import { AdminTopBar } from '@/components/admin/TopBar';

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminTopBar />
      <div className="app-shell no-langbar">
        <AdminSidebar />
        <main className="app-main">{children}</main>
      </div>
    </>
  );
}
