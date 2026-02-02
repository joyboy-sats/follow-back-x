import type { PlasmoCSConfig } from "plasmo"
import type { UnfollowUser } from "~types"
import { UNFOLLOW_STORAGE_KEY } from "~types"

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

  const img = cell.querySelector("img")
  const avatar = img?.getAttribute("src") ?? ""

  let name = id
  const skip = new Set(["关注了你", "關注了你", "正在关注", "Following", "Follow", "关注", "已关注"])
  const spans = cell.querySelectorAll("span")
  for (const s of spans) {
    const t = s.textContent?.trim()
    if (t && !t.startsWith("@") && t.length > 0 && t.length < 80 && !skip.has(t) && !FOLLOWS_YOU_LABELS.some((l) => t === l || t.includes(l))) {
      name = t
      break
    }
  }

  const descEl = cell.querySelector('[data-testid="UserDescription"]') ?? cell.querySelector('[data-testid="UserBio"]')
  const description = (descEl?.textContent ?? "").trim().slice(0, 200) || ""

  return { id, name, avatar, description }
}

function syncUnfollowStorage(toAdd: UnfollowUser[], toRemove: string[]): void {
  chrome.storage.local.get(UNFOLLOW_STORAGE_KEY, (data) => {
    let list: UnfollowUser[] = Array.isArray(data?.[UNFOLLOW_STORAGE_KEY]) ? data[UNFOLLOW_STORAGE_KEY] : []
    const removeSet = new Set(toRemove)
    list = list.filter((u) => !removeSet.has(u.id))
    const byId = new Map(list.map((u) => [u.id, u]))
    for (const u of toAdd) byId.set(u.id, u)
    chrome.storage.local.set({ [UNFOLLOW_STORAGE_KEY]: Array.from(byId.values()) })
  })
}

function removeUnfollowFromStorage(id: string): void {
  chrome.storage.local.get(UNFOLLOW_STORAGE_KEY, (data) => {
    const list: UnfollowUser[] = Array.isArray(data?.[UNFOLLOW_STORAGE_KEY]) ? data[UNFOLLOW_STORAGE_KEY] : []
    const next = list.filter((u) => u.id !== id)
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

    if (hasFollowsYouLabel(cell)) {
      const user = extractUserFromCell(cell)
      if (user) toRemove.push(user.id)
      removeAlertIcon(cell)
      return
    }

    if (cell.hasAttribute(ALERT_MARKER_ATTR)) return

    const user = extractUserFromCell(cell)
    const parent = btn.parentElement
    if (!parent) return

    parent.classList.add(ALERT_ROW_CLASS)
    const wrap = createAlertIcon()
    parent.insertBefore(wrap, btn)
    cell.setAttribute(ALERT_MARKER_ATTR, "1")
    if (user) toAdd.push(user)
  })

  if (toAdd.length > 0 || toRemove.length > 0) syncUnfollowStorage(toAdd, toRemove)
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

function checkProfileFollowsYou(): void {
  if (!isProfilePage()) return
  if (!document.querySelector(FOLLOWS_YOU_SELECTOR)) return
  const segs = location.pathname.split("/").filter(Boolean)
  const username = segs[0]
  if (username) removeUnfollowFromStorage(username)
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
    if (isFollowingPage()) {
      initOnFollowingPage()
    } else {
      initialized = false
      cleanup()
    }
    if (isProfilePage()) checkProfileFollowsYou()
  }, 400)
}

function run(): void {
  if (isFollowingPage()) {
    initOnFollowingPage()
  }
  if (isProfilePage()) checkProfileFollowsYou()
  startUrlCheck()
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run)
} else {
  run()
}
