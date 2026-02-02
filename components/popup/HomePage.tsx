import { useStore } from "~store/popup"

export default function HomePage() {
  const unfollowList = useStore((s) => s.unfollowList)

  const openProfile = (id: string) => {
    window.open(`https://x.com/${id}`, "_blank")
  }

  return (
    <div className="space-y-2">
      {unfollowList.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          暂无未回关用户。请访问 x.com/你的用户名/following 查看列表。
        </p>
      ) : (
        unfollowList.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => openProfile(u.id)}
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
              <div className="font-medium text-foreground">{u.name}</div>
              <div className="text-xs text-muted-foreground">@{u.id}</div>
              {u.description ? (
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {u.description}
                </div>
              ) : null}
            </div>
          </button>
        ))
      )}
    </div>
  )
}
