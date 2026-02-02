import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://x.com/*/following"],
  run_at: "document_idle",
}

const HIGHLIGHT_CLASS = "follow-back-x-unfollow-highlight"
const FOLLOWS_YOU_LABELS = ["关注了你", "Follows you", "フォローされています", "Te sigue", "Vous suit", "Segue você"]

function injectHighlightStyle(): void {
  if (document.getElementById("follow-back-x-styles")) return
  const style = document.createElement("style")
  style.id = "follow-back-x-styles"
  style.textContent = `.${HIGHLIGHT_CLASS}{background-color:#dc2626!important;color:#fff!important;}`
  document.head.appendChild(style)
}

function hasFollowsYouLabel(cell: Element): boolean {
  const text = cell.textContent ?? ""
  return FOLLOWS_YOU_LABELS.some((label) => text.includes(label))
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

function processUserCells(): void {
  const cells = document.querySelectorAll('[data-testid="UserCell"]')
  cells.forEach((cell) => {
    const btn = getFollowButton(cell)
    if (!btn) return
    if (hasFollowsYouLabel(cell)) {
      btn.classList.remove(HIGHLIGHT_CLASS)
    } else {
      btn.classList.add(HIGHLIGHT_CLASS)
    }
  })
}

function run(): void {
  injectHighlightStyle()
  processUserCells()

  const observer = new MutationObserver(() => {
    processUserCells()
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run)
} else {
  run()
}
