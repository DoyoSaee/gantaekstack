import { redirect } from "next/navigation";

// 시대 진단이 홈으로 승격됨 — 기존 /era 링크 호환용.
export default function EraPage() {
  redirect("/");
}
