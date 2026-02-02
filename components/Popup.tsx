import { IconUserCheck } from "@tabler/icons-react"
import { useStore } from "~store/popup"

export default function Popup() {
  const count = useStore((s) => s.unfollowCount)

  return (
    <div className="flex flex-col gap-4 p-4 text-gray-900">
      <div className="flex items-center gap-2">
        <IconUserCheck className="h-6 w-6 text-blue-500" stroke={1.5} />
        <h1 className="text-lg font-semibold">Follow Back X</h1>
      </div>
      <p className="text-sm text-gray-600">
        在 X 的「正在关注」页面打开时，未显示「关注了你」的用户其关注按钮会显示红色背景。
      </p>
      <p className="text-xs text-gray-500">
        请访问 x.com/你的用户名/following 使用。
      </p>
      {count !== null && (
        <p className="rounded-md bg-gray-100 px-3 py-2 text-sm">
          当前页未回关: {count}
        </p>
      )}
    </div>
  )
}
