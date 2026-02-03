import type { IgnoredUser, UnfollowUser } from "~types"
import {
  CURRENT_ACCOUNT_STORAGE_KEY,
  IGNORED_STORAGE_KEY,
  UNFOLLOW_STORAGE_KEY,
} from "~types"

function updateBadge(ownerId: string | null, list: UnfollowUser[], ignored: IgnoredUser[]): void {
  if (!ownerId) {
    chrome.action.setBadgeText({ text: "" })
    return
  }
  const ignoredSet = new Set(
    ignored.filter((u) => u.ownerId === ownerId).map((u) => u.id)
  )
  const count = list.filter(
    (u) => u.ownerId === ownerId && !ignoredSet.has(u.id)
  ).length
  const text = count > 0 ? (count > 99 ? "99+" : `${count}`) : ""
  chrome.action.setBadgeBackgroundColor({ color: "#ef4444" })
  chrome.action.setBadgeTextColor?.({ color: "#ffffff" })
  chrome.action.setBadgeText({ text })
}

function refreshBadge(): void {
  chrome.storage.local.get(
    [UNFOLLOW_STORAGE_KEY, IGNORED_STORAGE_KEY, CURRENT_ACCOUNT_STORAGE_KEY],
    (data) => {
      const ownerId =
        typeof data?.[CURRENT_ACCOUNT_STORAGE_KEY] === "string"
          ? data[CURRENT_ACCOUNT_STORAGE_KEY]
          : null
      const list: UnfollowUser[] = Array.isArray(data?.[UNFOLLOW_STORAGE_KEY])
        ? data[UNFOLLOW_STORAGE_KEY]
        : []
      const ignored: IgnoredUser[] = Array.isArray(data?.[IGNORED_STORAGE_KEY])
        ? data[IGNORED_STORAGE_KEY]
        : []
      updateBadge(ownerId, list, ignored)
    }
  )
}

chrome.runtime.onInstalled.addListener(() => {
  refreshBadge()
})

chrome.runtime.onStartup.addListener(() => {
  refreshBadge()
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return
  if (
    changes[UNFOLLOW_STORAGE_KEY] ||
    changes[IGNORED_STORAGE_KEY] ||
    changes[CURRENT_ACCOUNT_STORAGE_KEY]
  ) {
    refreshBadge()
  }
})
