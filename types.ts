export const UNFOLLOW_STORAGE_KEY = "followBackX_unfollowList"
export const CURRENT_ACCOUNT_STORAGE_KEY = "followBackX_currentAccount"
export const IGNORED_STORAGE_KEY = "followBackX_ignoredList"
export const MIGRATION_STORAGE_KEY = "followBackX_migrated_v2"

export interface UnfollowUser {
  id: string
  name: string
  avatar: string
  description: string
  verified?: boolean
  followersCount?: number
  ownerId?: string
}

export interface IgnoredUser {
  id: string
  ownerId: string
}
