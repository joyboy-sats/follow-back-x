import {
  IconChartAreaLine,
  IconChartAreaLineFilled,
  IconHome,
  IconHomeFilled,
  IconSettings,
  IconSettingsFilled,
} from "@tabler/icons-react"

export type Tab = "home" | "analysis" | "settings"

const TABS: { id: Tab; label: string; Icon: typeof IconHome; IconFilled: typeof IconHomeFilled }[] = [
  { id: "home", label: "首页", Icon: IconHome, IconFilled: IconHomeFilled },
  { id: "analysis", label: "分析", Icon: IconChartAreaLine, IconFilled: IconChartAreaLineFilled },
  { id: "settings", label: "设置", Icon: IconSettings, IconFilled: IconSettingsFilled },
]

interface NavProps {
  tab: Tab
  onTabChange: (tab: Tab) => void
}

export default function Nav({ tab, onTabChange }: NavProps) {
  return (
    <nav className="flex shrink-0 border-t border-border bg-background fixed bottom-0 left-0 w-full">
      {TABS.map(({ id, label, Icon, IconFilled }) => {
        const isActive = tab === id
        const IconComponent = isActive ? IconFilled : Icon
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition active:scale-75 ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-secondary-foreground"
            }`}
          >
            <IconComponent className="h-5 w-5 transition-transform" stroke={1.5} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
