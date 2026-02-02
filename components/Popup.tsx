import { useEffect, useState } from "react"
import { useStore } from "~store/popup"
import { UNFOLLOW_STORAGE_KEY } from "~types"
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

  useEffect(() => {
    loadUnfollowList()
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes[UNFOLLOW_STORAGE_KEY]) {
        const next = changes[UNFOLLOW_STORAGE_KEY].newValue
        setUnfollowList(Array.isArray(next) ? next : [])
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadUnfollowList, setUnfollowList])

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
