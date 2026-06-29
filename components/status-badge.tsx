const CHIP: Record<string, { bg: string; text: string; dot: string }> = {
  draft:                { bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400"    },
  ready_for_assessment: { bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500"    },
  assessed:             { bg: "bg-indigo-50",   text: "text-indigo-700",  dot: "bg-indigo-500"  },
  routed:               { bg: "bg-violet-50",   text: "text-violet-700",  dot: "bg-violet-500"  },
  in_review:            { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500"   },
  auto_approved:        { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  approved:             { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  escalated:            { bg: "bg-orange-50",   text: "text-orange-700",  dot: "bg-orange-500"  },
  denied:               { bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500"     },
  closed:               { bg: "bg-gray-100",    text: "text-gray-500",    dot: "bg-gray-400"    },
};

const LABEL: Record<string, string> = {
  draft:                "Draft",
  ready_for_assessment: "Ready",
  assessed:             "Assessed",
  routed:               "Routed",
  in_review:            "In Review",
  auto_approved:        "Auto-Approved",
  approved:             "Approved",
  escalated:            "Escalated",
  denied:               "Denied",
  closed:               "Closed",
};

export function StatusBadge({ status }: { status: string }) {
  const chip = CHIP[status] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${chip.bg} ${chip.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${chip.dot}`} />
      {LABEL[status] ?? status}
    </span>
  );
}
