import { LangBar } from '@/components/ui/LangBar';
import { CabinetSidebar } from '@/components/cabinet/Sidebar';
import { CabinetTopBar } from '@/components/cabinet/TopBar';

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LangBar />
      <CabinetTopBar />
      <div className="app-shell">
        <CabinetSidebar />
        <main className="app-main">{children}</main>
      </div>
    </>
  );
}
