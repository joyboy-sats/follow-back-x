import { IconUserCheck } from "@tabler/icons-react"

export default function Header() {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
      <IconUserCheck className="h-6 w-6 text-primary" stroke={1.5} />
      <h1 className="text-lg font-semibold">Follow Back X</h1>
    </header>
  )
}
