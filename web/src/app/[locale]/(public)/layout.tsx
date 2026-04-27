import { LangBar } from '@/components/ui/LangBar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNav } from '@/components/public/PublicNav';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LangBar />
      <PublicNav />
      <main>{children}</main>
      <PublicFooter />
    </>
  );
}
