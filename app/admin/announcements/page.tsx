import { AnnouncementForm } from "@/components/admin/AnnouncementForm";

export const dynamic = "force-dynamic";

export default function AdminAnnouncementsPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">공지 발송</h1>
        <p className="text-sm text-muted">
          전체·딜러·고객 대상으로 인앱 알림과 이메일을 한 번에 보냅니다.
        </p>
      </header>
      <AnnouncementForm />
    </div>
  );
}
