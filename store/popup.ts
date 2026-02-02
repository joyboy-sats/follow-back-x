import { create } from "zustand"
import type { UnfollowUser } from "~types"
import { UNFOLLOW_STORAGE_KEY } from "~types"

interface PopupState {
  unfollowCount: number | null
  setUnfollowCount: (n: number | null) => void
  unfollowList: UnfollowUser[]
  setUnfollowList: (list: UnfollowUser[]) => void
  loadUnfollowList: () => void
}

export const useStore = create<PopupState>((set) => ({
  unfollowCount: null,
  setUnfollowCount: (n) => set({ unfollowCount: n }),
  unfollowList: [],
  setUnfollowList: (list) => set({ unfollowList: list }),
  loadUnfollowList: () => {
    chrome.storage.local.get(UNFOLLOW_STORAGE_KEY, (data) => {
      const list = Array.isArray(data?.[UNFOLLOW_STORAGE_KEY])
        ? data[UNFOLLOW_STORAGE_KEY]
        : []
      set({ unfollowList: list })
    })
  },
}))
