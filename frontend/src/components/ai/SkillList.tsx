import { Check } from "lucide-react";
import { SectionLabel } from "@/components/ui/primitives";

export default function SkillList({ title, skills, kind, empty }: { title: string; skills: string[]; kind: "have" | "missing"; empty?: React.ReactNode }) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <li
            key={s}
            className={
              kind === "have"
                ? "inline-flex h-7 items-center gap-1 rounded-md bg-success-soft px-2 text-xs font-medium text-success"
                : "inline-flex h-7 items-center rounded-md border border-dashed border-warning/40 px-2 text-xs font-medium text-warning"
            }
          >
            {kind === "have" && <Check size={12} />}
            {s}
          </li>
        ))}
        {skills.length === 0 && <li className="text-sm text-muted">{empty}</li>}
      </ul>
    </div>
  );
}
