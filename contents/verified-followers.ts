import type { PlasmoCSConfig } from "plasmo"
import type { IgnoredUser, UnfollowUser } from "~types"
import {
  CURRENT_ACCOUNT_STORAGE_KEY,
  IGNORED_STORAGE_KEY,
  UNFOLLOW_STORAGE_KEY,
} from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://x.com/*"],
  run_at: "document_idle",
}

const ALERT_ICON_CLASS = "follow-back-x-alert-icon"
const ALERT_WRAP_CLASS = "follow-back-x-alert-wrap"
const ALERT_TOOLTIP_CLASS = "follow-back-x-alert-tooltip"
const ALERT_ROW_CLASS = "follow-back-x-alert-row"
const ALERT_MARKER_ATTR = "data-follow-back-x-alert"
const TOOLTIP_TEXT = "他没有关注你"
/** X 用 data-testid="userFollowIndicator" 标记「关注了你」，语言无关 */
const FOLLOWS_YOU_SELECTOR = '[data-testid="userFollowIndicator"]'
/** 文本后备：X 改版或部分页面无 data-testid 时用 */
const FOLLOWS_YOU_LABELS = [
  "关注了你",
  "關注了你",
  "Follows you",
  "フォローされています",
  "Te sigue",
  "Vous suit",
  "Segue você",
  "Seguiti da questo utente",
  "Folgt dir",
  "Seni takip ediyor",
  "تابعك",
  "Sigue a ti",
  "팔로우 중",
  "Volgt je",
  "Följer dig",
  "Śledzi Cię",
]

function injectStyles(): void {
  if (document.getElementById("follow-back-x-styles")) return
  const style = document.createElement("style")
  style.id = "follow-back-x-styles"
  style.textContent = `
.${ALERT_ROW_CLASS}{
  display:flex!important;
  align-items:center!important;
  flex-direction:row!important;
}
.${ALERT_ICON_CLASS}{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:18px!important;
  height:18px!important;
  min-width:18px!important;
  border-radius:50%!important;
  background-color:#dc2626!important;
  color:#fff!important;
  font-size:12px!important;
  font-weight:700!important;
  margin-right:4px!important;
  flex-shrink:0!important;
  line-height:1!important;
}
.${ALERT_ICON_CLASS}[title]{ cursor:pointer; }
.${ALERT_WRAP_CLASS}{
  position:relative!important;
  display:inline-flex!important;
}
.${ALERT_WRAP_CLASS}:hover .${ALERT_TOOLTIP_CLASS}{
  opacity:1!important;
  visibility:visible!important;
}
.${ALERT_TOOLTIP_CLASS}{
  position:absolute!important;
  bottom:100%!important;
  left:50%!important;
  transform:translateX(-50%)!important;
  margin-bottom:6px!important;
  background:#333!important;
  color:#fff!important;
  padding:6px 10px!important;
  border-radius:6px!important;
  font-size:12px!important;
  white-space:nowrap!important;
  z-index:99999!important;
  opacity:0!important;
  visibility:hidden!important;
  transition:opacity .15s,visibility .15s!important;
  pointer-events:none!important;
}
`
  document.head.appendChild(style)
}

function hasFollowsYouLabel(cell: Element): boolean {
  if (cell.querySelector(FOLLOWS_YOU_SELECTOR)) return true
  const text = cell.textContent ?? ""
  return FOLLOWS_YOU_LABELS.some((label) => text.includes(label))
}

function getAvatarUrl(cell: Element): string {
  const pickFromImg = (img: HTMLImageElement | null): string => {
    if (!img) return ""
    const src = img.getAttribute("src") ?? ""
    if (src) return src
    const srcset = img.getAttribute("srcset") ?? ""
    if (srcset) {
      const first = srcset.split(",")[0]?.trim().split(" ")[0]
      if (first) return first
    }
    return ""
  }

  const container =
    (cell.querySelector('[data-testid="UserAvatar-Container"]') as HTMLElement | null) ??
    (cell.querySelector('[data-testid="UserAvatar-Clickable"]') as HTMLElement | null)
  const primaryImg =
    (container?.querySelector('img[src*="profile_images"]') as HTMLImageElement | null) ??
    (cell.querySelector('img[src*="profile_images"]') as HTMLImageElement | null) ??
    (cell.querySelector('img[src*="twimg.com/profile_images"]') as HTMLImageElement | null)
  const primarySrc = pickFromImg(primaryImg)
  if (primarySrc) return primarySrc

  const fallbackImg = (container?.querySelector("img") as HTMLImageElement | null) ?? (cell.querySelector("img") as HTMLImageElement | null)
  const fallbackSrc = pickFromImg(fallbackImg)
  if (fallbackSrc) return fallbackSrc

  const styleTarget = container ?? (cell.querySelector("div[style*='background-image']") as HTMLElement | null)
  const bg = styleTarget?.style?.backgroundImage ?? ""
  const match = bg.match(/url\((['"]?)(.*?)\1\)/)
  return match?.[2] ?? ""
}

function isBlueVerified(cell: Element): boolean {
  if (cell.querySelector('[data-testid="icon-verified"]')) return true
  const svg = cell.querySelector("svg[aria-label]")
  if (!svg) return false
  const label = svg.getAttribute("aria-label") ?? ""
  return /verified|已验证|認證|認証/.test(label)
}

const RESERVED_PATHS = new Set([
  "home", "explore", "search", "settings", "compose", "messages",
  "notifications", "i", "intent", "share", "hashtag", "welcome",
])

function extractUserFromCell(cell: Element): UnfollowUser | null {
  let id = ""
  const allLinks = cell.querySelectorAll('a[href*="/"]')
  for (const link of allLinks) {
    const href = (link.getAttribute("href") ?? "").trim()
    const path = href.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "")
    const segments = path.split("/").filter(Boolean)
    const first = segments[0] ?? ""
    if (first && !RESERVED_PATHS.has(first) && /^[a-zA-Z0-9_]+$/.test(first)) {
      id = first
      break
    }
  }
  if (!id) {
    const text = cell.textContent ?? ""
    const match = text.match(/@([a-zA-Z0-9_]+)/)
    if (match) id = match[1]
  }
  if (!id) return null

  const avatar = getAvatarUrl(cell)

  let name = id
  const skip = new Set(["关注了你", "關注了你", "正在关注", "Following", "Follow", "关注", "已关注", id])
  const nameRoot = cell.querySelector('[data-testid="User-Name"]')
  const nameSpans = nameRoot ? nameRoot.querySelectorAll("span") : cell.querySelectorAll("span")
  for (const s of nameSpans) {
    const t = s.textContent?.trim()
    if (
      t &&
      !t.startsWith("@") &&
      t.length > 0 &&
      t.length < 80 &&
      !skip.has(t) &&
      !FOLLOWS_YOU_LABELS.some((l) => t === l || t.includes(l))
    ) {
      name = t
      break
    }
  }

  const descEl = cell.querySelector('[data-testid="UserDescription"]') ?? cell.querySelector('[data-testid="UserBio"]')
  const description = (descEl?.textContent ?? "").trim().slice(0, 200) || ""

  const verified = isBlueVerified(cell)

  return { id, name, avatar, description, verified }
}

function syncUnfollowStorage(
  toAdd: UnfollowUser[],
  toRemove: string[],
  ownerId: string
): void {
  chrome.storage.local.get(
    [UNFOLLOW_STORAGE_KEY, IGNORED_STORAGE_KEY],
    (data) => {
      let list: UnfollowUser[] = Array.isArray(data?.[UNFOLLOW_STORAGE_KEY])
        ? data[UNFOLLOW_STORAGE_KEY]
        : []
      const ignored: IgnoredUser[] = Array.isArray(data?.[IGNORED_STORAGE_KEY])
        ? data[IGNORED_STORAGE_KEY]
        : []
      const ignoredSet = new Set(
        ignored
          .filter((u) => u.ownerId === ownerId)
          .map((u) => u.id)
      )
      const removeSet = new Set(toRemove)
      list = list.filter(
        (u) => !(u.ownerId === ownerId && removeSet.has(u.id))
      )
      const byId = new Map(
        list.map((u) => [`${u.ownerId ?? "unknown"}:${u.id}`, u])
      )
      const merge = (base: UnfollowUser | undefined, next: UnfollowUser) => ({
        id: next.id,
        name: next.name || base?.name || next.id,
        avatar: next.avatar || base?.avatar || "",
        description: next.description || base?.description || "",
        verified: next.verified ?? base?.verified,
        followersCount: next.followersCount ?? base?.followersCount,
        ownerId: ownerId,
      })
      for (const u of toAdd) {
        if (ignoredSet.has(u.id)) continue
        const key = `${ownerId}:${u.id}`
        const existing = byId.get(key)
        byId.set(key, merge(existing, u))
      }
      chrome.storage.local.set({
        [UNFOLLOW_STORAGE_KEY]: Array.from(byId.values()),
      })
    }
  )
}


function removeUnfollowFromStorage(id: string, ownerId: string): void {
  chrome.storage.local.get(UNFOLLOW_STORAGE_KEY, (data) => {
    const list: UnfollowUser[] = Array.isArray(data?.[UNFOLLOW_STORAGE_KEY])
      ? data[UNFOLLOW_STORAGE_KEY]
      : []
    const next = list.filter(
      (u) => !(u.id === id && u.ownerId === ownerId)
    )
    chrome.storage.local.set({ [UNFOLLOW_STORAGE_KEY]: next })
  })
}

function getFollowButton(cell: Element): HTMLButtonElement | null {
  const buttons = cell.querySelectorAll('button[role="button"]')
  for (const btn of buttons) {
    const t = (btn.textContent ?? "").trim()
    if (
      t === "Follow" ||
      t === "关注" ||
      t === "フォロー" ||
      t === "Seguir" ||
      t === "Following" ||
      t === "已关注" ||
      t === "正在关注" ||
      t === "フォロー中" ||
      t === "Siguiendo"
    ) {
      return btn as HTMLButtonElement
    }
  }
  const lastButton = cell.querySelector('div[role="group"] button[role="button"]')
  return lastButton ? (lastButton as HTMLButtonElement) : null
}

function createAlertIcon(): HTMLDivElement {
  const wrap = document.createElement("div")
  wrap.className = ALERT_WRAP_CLASS
  const span = document.createElement("span")
  span.className = ALERT_ICON_CLASS
  span.setAttribute("title", TOOLTIP_TEXT)
  span.setAttribute("aria-label", TOOLTIP_TEXT)
  span.textContent = "!"
  const tooltip = document.createElement("span")
  tooltip.className = ALERT_TOOLTIP_CLASS
  tooltip.textContent = TOOLTIP_TEXT
  wrap.appendChild(span)
  wrap.appendChild(tooltip)
  return wrap
}

function removeAlertIcon(cell: Element): void {
  const icon = cell.querySelector(`.${ALERT_ICON_CLASS}`)
  const wrap = icon?.parentElement
  if (wrap?.classList.contains(ALERT_WRAP_CLASS)) {
    wrap.parentElement?.classList.remove(ALERT_ROW_CLASS)
    wrap.remove()
  } else {
    icon?.parentElement?.classList.remove(ALERT_ROW_CLASS)
    icon?.remove()
  }
  cell.removeAttribute(ALERT_MARKER_ATTR)
}

function processUserCells(): void {
  if (!location.pathname.endsWith("/following")) return
  const ownerId = getOwnerFromFollowingPath()
  if (!ownerId) return
  const currentAccount = refreshCurrentAccount()
  if (!currentAccount) return
  if (currentAccount !== ownerId) return
  const primaryColumn = document.querySelector('[data-testid="primaryColumn"]')
  document.querySelectorAll(`.${ALERT_ICON_CLASS}`).forEach((icon) => {
    if (primaryColumn?.contains(icon)) return
    const wrap = icon.parentElement
    if (wrap?.classList.contains(ALERT_WRAP_CLASS)) {
      wrap.parentElement?.classList.remove(ALERT_ROW_CLASS)
      wrap.remove()
    } else {
      icon.remove()
    }
  })
  if (!primaryColumn) return
  const cells = primaryColumn.querySelectorAll('[data-testid="UserCell"]')
  const toAdd: UnfollowUser[] = []
  const toRemove: string[] = []

  cells.forEach((cell) => {
    const btn = getFollowButton(cell)
    if (!btn) return

    const user = extractUserFromCell(cell)
    if (hasFollowsYouLabel(cell)) {
      if (user) toRemove.push(user.id)
      removeAlertIcon(cell)
      return
    }

    if (user) toAdd.push({ ...user, ownerId })
    if (cell.hasAttribute(ALERT_MARKER_ATTR)) return
    const parent = btn.parentElement
    if (!parent) return

    parent.classList.add(ALERT_ROW_CLASS)
    const wrap = createAlertIcon()
    parent.insertBefore(wrap, btn)
    cell.setAttribute(ALERT_MARKER_ATTR, "1")
  })

  if (toAdd.length > 0 || toRemove.length > 0)
    syncUnfollowStorage(toAdd, toRemove, ownerId)
}

let initialized = false
let urlCheckTimer: ReturnType<typeof setInterval> | null = null
let domObserver: MutationObserver | null = null

const PROFILE_RESERVED = new Set(["home", "explore", "search", "settings", "compose", "messages", "notifications", "i", "intent", "share", "hashtag", "explore", "notifications"])

function isFollowingPage(): boolean {
  return location.pathname.endsWith("/following")
}

function isProfilePage(): boolean {
  const segs = location.pathname.split("/").filter(Boolean)
  return segs.length === 1 && !PROFILE_RESERVED.has(segs[0])
}

function getOwnerFromFollowingPath(): string | null {
  const segs = location.pathname.split("/").filter(Boolean)
  if (segs.length >= 2 && segs[1] === "following") return segs[0]
  return null
}

function extractUsernameFromHref(href: string): string | null {
  const path = href.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "")
  const segs = path.split("/").filter(Boolean)
  const first = segs[0] ?? ""
  if (first && !PROFILE_RESERVED.has(first) && /^[a-zA-Z0-9_]+$/.test(first)) {
    return first
  }
  return null
}

function getSidebarUsername(): string | null {
  const profileLink =
    (document.querySelector(
      'a[data-testid="AppTabBar_Profile_Link"]'
    ) as HTMLAnchorElement | null) ??
    (document.querySelector(
      'a[aria-label*="Profile"]'
    ) as HTMLAnchorElement | null)
  if (profileLink?.href) {
    const fromHref = extractUsernameFromHref(profileLink.href)
    if (fromHref) return fromHref
  }
  const nav = document.querySelector('[aria-label="Primary"]')
  const links = nav?.querySelectorAll("a[href*='/']") ?? []
  for (const link of Array.from(links)) {
    const href = (link as HTMLAnchorElement).href
    const fromHref = extractUsernameFromHref(href)
    if (fromHref) return fromHref
  }
  const handle = document.querySelector('a[href^="/"][aria-label*="@"]')
  const text = handle?.textContent ?? ""
  const match = text.match(/@([a-zA-Z0-9_]+)/)
  return match?.[1] ?? null
}

function refreshCurrentAccount(): string | null {
  const id = getSidebarUsername()
  if (id) {
    chrome.storage.local.set({ [CURRENT_ACCOUNT_STORAGE_KEY]: id })
    chrome.storage.local.get(UNFOLLOW_STORAGE_KEY, (data) => {
      const list: UnfollowUser[] = Array.isArray(data?.[UNFOLLOW_STORAGE_KEY])
        ? data[UNFOLLOW_STORAGE_KEY]
        : []
      let changed = false
      const next = list.map((u) => {
        if (!u.ownerId) {
          changed = true
          return { ...u, ownerId: id }
        }
        return u
      })
      if (changed) {
        chrome.storage.local.set({ [UNFOLLOW_STORAGE_KEY]: next })
      }
    })
  }
  return id
}

function withCurrentAccount(fn: (id: string | null) => void): void {
  chrome.storage.local.get(CURRENT_ACCOUNT_STORAGE_KEY, (data) => {
    const id =
      typeof data?.[CURRENT_ACCOUNT_STORAGE_KEY] === "string"
        ? data[CURRENT_ACCOUNT_STORAGE_KEY]
        : null
    fn(id)
  })
}

function checkProfileFollowsYou(): void {
  if (!isProfilePage()) return
  if (!document.querySelector(FOLLOWS_YOU_SELECTOR)) return
  const segs = location.pathname.split("/").filter(Boolean)
  const username = segs[0]
  if (!username) return
  withCurrentAccount((ownerId) => {
    if (!ownerId) return
    removeUnfollowFromStorage(username, ownerId)
  })
}

function parseCountText(text: string): number | null {
  const clean = text.replace(/,/g, "").trim()
  const match = clean.match(/([\d.]+)\s*([KkMmBb万亿]?)/)
  if (!match) return null
  let n = Number.parseFloat(match[1])
  if (Number.isNaN(n)) return null
  const unit = match[2]
  if (unit === "K" || unit === "k") n *= 1e3
  else if (unit === "M" || unit === "m") n *= 1e6
  else if (unit === "B" || unit === "b") n *= 1e9
  else if (unit === "万") n *= 1e4
  else if (unit === "亿") n *= 1e8
  return Math.round(n)
}

function getProfileFollowersCount(username: string): number | null {
  const primary = document.querySelector('[data-testid="primaryColumn"]') ?? document.body
  const links = primary.querySelectorAll('a[href*="/followers"]')
  for (const link of links) {
    const href = link.getAttribute("href") ?? ""
    if (!href.includes(`/${username}/followers`)) continue
    const text = (link.textContent ?? "").trim()
    const count = parseCountText(text)
    if (typeof count === "number") return count
  }
  return null
}

function getProfileMetaContent(key: string): string {
  const byProp = document.querySelector(`meta[property="${key}"]`) as HTMLMetaElement | null
  if (byProp?.content) return byProp.content
  const byName = document.querySelector(`meta[name="${key}"]`) as HTMLMetaElement | null
  return byName?.content ?? ""
}

function getProfileAvatar(): string {
  return getProfileMetaContent("og:image") || getProfileMetaContent("twitter:image")
}

function getProfileName(username: string): string {
  const title = getProfileMetaContent("og:title") || document.title
  const marker = `(@${username})`
  if (title.includes(marker)) {
    return title.split(marker)[0]?.trim() || username
  }
  const match = title.match(/^(.*?)\s+\(@/i)
  if (match?.[1]) return match[1].trim()
  return username
}

function isProfileVerified(): boolean {
  if (document.querySelector('[data-testid="icon-verified"]')) return true
  const svg = document.querySelector('svg[aria-label*="Verified"], svg[aria-label*="已验证"], svg[aria-label*="認證"], svg[aria-label*="認証"]')
  return Boolean(svg)
}

function updateUserFromProfilePage(): void {
  if (!isProfilePage()) return
  const segs = location.pathname.split("/").filter(Boolean)
  const username = segs[0]
  if (!username) return
  const followersCount = getProfileFollowersCount(username)
  const avatar = getProfileAvatar()
  const name = getProfileName(username)
  const verified = isProfileVerified()
  if (!avatar && !name && typeof followersCount !== "number") return
  withCurrentAccount((ownerId) => {
    if (!ownerId) return
    chrome.storage.local.get(UNFOLLOW_STORAGE_KEY, (data) => {
      const list: UnfollowUser[] = Array.isArray(data?.[UNFOLLOW_STORAGE_KEY])
        ? data[UNFOLLOW_STORAGE_KEY]
        : []
      const idx = list.findIndex(
        (u) => u.id === username && u.ownerId === ownerId
      )
      if (idx === -1) return
      const existing = list[idx]
      const next = {
        ...existing,
        name: name || existing.name,
        avatar: avatar || existing.avatar,
        verified: verified ? true : existing.verified,
        followersCount:
          typeof followersCount === "number"
            ? followersCount
            : existing.followersCount,
      }
      const updated = [...list]
      updated[idx] = next
      chrome.storage.local.set({ [UNFOLLOW_STORAGE_KEY]: updated })
    })
  })
}

function cleanup(): void {
  domObserver?.disconnect()
  domObserver = null
  document.querySelectorAll(`.${ALERT_WRAP_CLASS}`).forEach((wrap) => {
    wrap.parentElement?.classList.remove(ALERT_ROW_CLASS)
    wrap.remove()
  })
  document.querySelectorAll(`[${ALERT_MARKER_ATTR}]`).forEach((el) => el.removeAttribute(ALERT_MARKER_ATTR))
}

function initOnFollowingPage(): void {
  if (initialized) return
  initialized = true
  injectStyles()
  processUserCells()
  domObserver = new MutationObserver(() => {
    processUserCells()
  })
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function startUrlCheck(): void {
  if (urlCheckTimer) return
  urlCheckTimer = setInterval(() => {
    refreshCurrentAccount()
    if (isFollowingPage()) {
      initOnFollowingPage()
    } else {
      initialized = false
      cleanup()
    }
    if (isProfilePage()) {
      checkProfileFollowsYou()
      updateUserFromProfilePage()
    }
  }, 400)
}

function run(): void {
  refreshCurrentAccount()
  if (isFollowingPage()) {
    initOnFollowingPage()
  }
  if (isProfilePage()) {
    checkProfileFollowsYou()
    updateUserFromProfilePage()
  }
  startUrlCheck()
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run)
} else {
  run()
}
