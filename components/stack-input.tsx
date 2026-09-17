"use client";

import { useRouter } from "next/navigation";
import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// 내 스택 입력 → /gap?skills=React,TypeScript,... 로 이동.
// 칩 UI: Enter/쉼표로 추가, 칩 클릭으로 삭제.
export function StackInput({
  initial = [],
  region,
}: {
  initial?: string[];
  region?: string;
}) {
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  function commit(next: string[]) {
    setSkills(next);
    const p = new URLSearchParams();
    if (next.length) p.set("skills", next.join(","));
    if (region) p.set("region", region);
    const q = p.toString();
    router.push(q ? `/gap?${q}` : "/gap");
  }

  function add(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...skills];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    setDraft("");
    if (next.length !== skills.length) commit(next);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) add(draft);
    } else if (e.key === "Backspace" && !draft && skills.length) {
      commit(skills.slice(0, -1));
    }
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {skills.map((s) => (
          <Badge
            key={s}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => commit(skills.filter((x) => x !== s))}
          >
            {s} <span className="ml-1 text-muted-foreground">×</span>
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={skills.length ? "기술 추가…" : "예: React, TypeScript, Node.js, AWS"}
          className="h-8 w-56 flex-1 border-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
