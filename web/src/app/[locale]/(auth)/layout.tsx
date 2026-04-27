import { LangBar } from '@/components/ui/LangBar';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LangBar />
      {children}
    </>
  );
}
