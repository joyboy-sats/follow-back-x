import { useEffect, useState } from "react"
import { useStore } from "~store/popup"
import {
  CURRENT_ACCOUNT_STORAGE_KEY,
  IGNORED_STORAGE_KEY,
  MIGRATION_STORAGE_KEY,
  UNFOLLOW_STORAGE_KEY,
} from "~types"
import {
  AnalysisPage,
  Header,
  HomePage,
  Nav,
  SettingsPage,
  type Tab,
} from "./popup/index"

export default function Popup() {
  const [tab, setTab] = useState<Tab>("home")
  const loadUnfollowList = useStore((s) => s.loadUnfollowList)
  const setUnfollowList = useStore((s) => s.setUnfollowList)
  const loadIgnoredList = useStore((s) => s.loadIgnoredList)
  const setIgnoredList = useStore((s) => s.setIgnoredList)
  const loadCurrentAccountId = useStore((s) => s.loadCurrentAccountId)
  const setCurrentAccountId = useStore((s) => s.setCurrentAccountId)

  useEffect(() => {
    chrome.storage.local.get(MIGRATION_STORAGE_KEY, (data) => {
      const done = data?.[MIGRATION_STORAGE_KEY] === true
      if (done) return
      chrome.storage.local.remove(
        [UNFOLLOW_STORAGE_KEY, IGNORED_STORAGE_KEY, CURRENT_ACCOUNT_STORAGE_KEY],
        () => {
          chrome.storage.local.set({ [MIGRATION_STORAGE_KEY]: true })
        }
      )
    })
    loadUnfollowList()
    loadIgnoredList()
    loadCurrentAccountId()
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes[UNFOLLOW_STORAGE_KEY]) {
        const next = changes[UNFOLLOW_STORAGE_KEY].newValue
        setUnfollowList(Array.isArray(next) ? next : [])
      }
      if (changes[IGNORED_STORAGE_KEY]) {
        const next = changes[IGNORED_STORAGE_KEY].newValue
        setIgnoredList(Array.isArray(next) ? next : [])
      }
      if (changes[CURRENT_ACCOUNT_STORAGE_KEY]) {
        const next = changes[CURRENT_ACCOUNT_STORAGE_KEY].newValue
        setCurrentAccountId(typeof next === "string" ? next : null)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [
    loadUnfollowList,
    loadIgnoredList,
    loadCurrentAccountId,
    setUnfollowList,
    setIgnoredList,
    setCurrentAccountId,
  ])

  return (
    <div className="flex flex-col bg-background text-foreground">
      <Header />
      <main className="min-h-0 flex-1 overflow-auto p-3">
        {tab === "home" && <HomePage />}
        {tab === "analysis" && <AnalysisPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
      <Nav tab={tab} onTabChange={setTab} />
    </div>
  )
}
