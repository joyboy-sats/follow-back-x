import { create } from "zustand"

interface PopupState {
  unfollowCount: number | null
  setUnfollowCount: (n: number | null) => void
}

export const useStore = create<PopupState>((set) => ({
  unfollowCount: null,
  setUnfollowCount: (n) => set({ unfollowCount: n }),
}))
