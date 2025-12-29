import { ExamProvider } from '@/providers/ExamProvider';
import { ExamContent } from '@/components/ExamContent';

export default function ExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ExamProvider>
      <ExamContent>{children}</ExamContent>
    </ExamProvider>
  );
}
