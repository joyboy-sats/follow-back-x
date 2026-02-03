import { useStore } from "~store/popup"

export default function HomePage() {
  const unfollowList = useStore((s) => s.unfollowList)
  const ignoredList = useStore((s) => s.ignoredList)
  const currentAccountId = useStore((s) => s.currentAccountId)
  const ignoreUser = useStore((s) => s.ignoreUser)
  const ignoreUsers = useStore((s) => s.ignoreUsers)

  const openProfile = (id: string) => {
    window.open(`https://x.com/${id}`, "_blank")
  }

  const formatCount = (n: number) => {
    const trim = (v: string) => v.replace(/\.0$/, "")
    if (n >= 1e6) return `${trim((n / 1e6).toFixed(1))}m`
    if (n >= 1e3) return `${trim((n / 1e3).toFixed(1))}k`
    return `${n}`
  }

  const ignoredSet = new Set(
    ignoredList
      .filter((u) => (currentAccountId ? u.ownerId === currentAccountId : true))
      .map((u) => u.id)
  )
  const visibleList = currentAccountId
    ? unfollowList.filter(
      (u) => u.ownerId === currentAccountId && !ignoredSet.has(u.id)
    )
    : []

  return (
    <div className="space-y-2">
      {currentAccountId ? (
        <div className="relative mb-1 flex items-center justify-between">
          <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-foreground">
            未互关的用户
          </div>

          <button
            type="button"
            onClick={() =>
              ignoreUsers(
                visibleList.map((u) => u.id),
                currentAccountId
              )
            }
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:border-destructive hover:text-destructive"
          >
            一键忽视
          </button>
        </div>
      ) : null}
      {!currentAccountId ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          暂未识别当前账号。请先访问 x.com/你的用户名/following。
        </p>
      ) : visibleList.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          暂无未回关用户。请访问 x.com/你的用户名/following 查看列表。
        </p>
      ) : (
        visibleList.map((u) => (
          <div
            key={u.id}
            onClick={() => openProfile(u.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                openProfile(u.id)
              }
            }}
            role="button"
            tabIndex={0}
            className="flex w-full items-start gap-3 rounded-lg border border-border bg-card/80 p-3 text-left transition hover:bg-secondary"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
              {u.avatar ? (
                <img
                  src={u.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => e.currentTarget.remove()}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 font-medium text-foreground">
                <span className="min-w-0 truncate">{u.name || u.id}</span>
                {u.verified ? (
                  <svg
                    viewBox="0 0 22 22"
                    aria-label="认证账号"
                    role="img"
                    className="h-4 w-4 fill-current text-[#1d9bf0]"
                    data-testid="icon-verified"
                  >
                    <g>
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                    </g>
                  </svg>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">@{u.id}</div>
              {typeof u.followersCount === "number" ? (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  粉丝 {formatCount(u.followersCount)}
                </div>
              ) : null}
              {u.description ? (
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {u.description}
                </div>
              ) : null}
            </div>
            <div className="ml-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  ignoreUser(u.id, currentAccountId)
                }}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:border-destructive hover:text-destructive"
              >
                忽视
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
