import logoUrl from "data-base64:~assets/icon-64.png"

export default function Header() {
  return (
    <header className="relative flex shrink-0 items-center justify-center border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <img
          src={logoUrl}
          alt="Follow Back X"
          className="h-6 w-6 rounded-sm"
        />
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Follow Back X
        </h1>
      </div>
    </header>
  )
}
