import { create } from "zustand"
import type { IgnoredUser, UnfollowUser } from "~types"
import {
  CURRENT_ACCOUNT_STORAGE_KEY,
  IGNORED_STORAGE_KEY,
  UNFOLLOW_STORAGE_KEY,
} from "~types"

interface PopupState {
  unfollowCount: number | null
  setUnfollowCount: (n: number | null) => void
  unfollowList: UnfollowUser[]
  setUnfollowList: (list: UnfollowUser[]) => void
  loadUnfollowList: () => void
  ignoredList: IgnoredUser[]
  setIgnoredList: (list: IgnoredUser[]) => void
  loadIgnoredList: () => void
  currentAccountId: string | null
  setCurrentAccountId: (id: string | null) => void
  loadCurrentAccountId: () => void
  ignoreUser: (id: string, ownerId: string) => void
  ignoreUsers: (ids: string[], ownerId: string) => void
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
  ignoredList: [],
  setIgnoredList: (list) => set({ ignoredList: list }),
  loadIgnoredList: () => {
    chrome.storage.local.get(IGNORED_STORAGE_KEY, (data) => {
      const list = Array.isArray(data?.[IGNORED_STORAGE_KEY])
        ? data[IGNORED_STORAGE_KEY]
        : []
      set({ ignoredList: list })
    })
  },
  currentAccountId: null,
  setCurrentAccountId: (id) => set({ currentAccountId: id }),
  loadCurrentAccountId: () => {
    chrome.storage.local.get(CURRENT_ACCOUNT_STORAGE_KEY, (data) => {
      const id =
        typeof data?.[CURRENT_ACCOUNT_STORAGE_KEY] === "string"
          ? data[CURRENT_ACCOUNT_STORAGE_KEY]
          : null
      set({ currentAccountId: id })
    })
  },
  ignoreUser: (id, ownerId) => {
    chrome.storage.local.get(
      [IGNORED_STORAGE_KEY, UNFOLLOW_STORAGE_KEY],
      (data) => {
        const ignored: IgnoredUser[] = Array.isArray(
          data?.[IGNORED_STORAGE_KEY]
        )
          ? data[IGNORED_STORAGE_KEY]
          : []
        const unfollow: UnfollowUser[] = Array.isArray(
          data?.[UNFOLLOW_STORAGE_KEY]
        )
          ? data[UNFOLLOW_STORAGE_KEY]
          : []
        const exists = ignored.some(
          (u) => u.id === id && u.ownerId === ownerId
        )
        const nextIgnored = exists
          ? ignored
          : [...ignored, { id, ownerId }]
        const nextUnfollow = unfollow.filter(
          (u) => !(u.id === id && u.ownerId === ownerId)
        )
        chrome.storage.local.set({
          [IGNORED_STORAGE_KEY]: nextIgnored,
          [UNFOLLOW_STORAGE_KEY]: nextUnfollow,
        })
        set({ ignoredList: nextIgnored, unfollowList: nextUnfollow })
      }
    )
  },
  ignoreUsers: (ids, ownerId) => {
    if (ids.length === 0) return
    chrome.storage.local.get(
      [IGNORED_STORAGE_KEY, UNFOLLOW_STORAGE_KEY],
      (data) => {
        const ignored: IgnoredUser[] = Array.isArray(
          data?.[IGNORED_STORAGE_KEY]
        )
          ? data[IGNORED_STORAGE_KEY]
          : []
        const unfollow: UnfollowUser[] = Array.isArray(
          data?.[UNFOLLOW_STORAGE_KEY]
        )
          ? data[UNFOLLOW_STORAGE_KEY]
          : []
        const idSet = new Set(ids)
        const existingSet = new Set(
          ignored
            .filter((u) => u.ownerId === ownerId)
            .map((u) => u.id)
        )
        const mergedIgnored = [
          ...ignored,
          ...ids
            .filter((id) => !existingSet.has(id))
            .map((id) => ({ id, ownerId })),
        ]
        const nextUnfollow = unfollow.filter(
          (u) => !(u.ownerId === ownerId && idSet.has(u.id))
        )
        chrome.storage.local.set({
          [IGNORED_STORAGE_KEY]: mergedIgnored,
          [UNFOLLOW_STORAGE_KEY]: nextUnfollow,
        })
        set({ ignoredList: mergedIgnored, unfollowList: nextUnfollow })
      }
    )
  },
}))
