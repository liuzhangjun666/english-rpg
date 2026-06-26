import { defineStore } from 'pinia'
import { useApiClient } from '../services/api'

export interface MailRewardItem {
  item_id: string
  quantity: number
  name?: string
}

export interface MailRewards {
  spirit_stone?: number
  exp?: number
  spirit_power?: number
  items?: MailRewardItem[]
}

export interface MailMessage {
  id: string
  title: string
  body: string
  time?: string
  read: boolean
  type?: string
  sender?: string
  action?: 'signin' | 'dailyQuest' | 'exam' | string
  rewards?: MailRewards | null
  has_rewards?: boolean
  claimed?: boolean
  claimable?: boolean
}

export interface ClaimResult {
  success: boolean
  message?: string
  rewards?: MailRewards
}

export const useMailStore = defineStore('mail', {
  state: () => ({
    messages: [] as MailMessage[],
    unread: 0,
    loading: false,
    loaded: false,
  }),
  actions: {
    // 拉取收件箱。失败静默——邮件是辅助提醒，不应阻塞主流程或弹错。
    async fetchInbox() {
      this.loading = true
      try {
        const api = useApiClient()
        const res = await api.get('/mail/inbox')
        if (res?.success && res.data) {
          this.messages = res.data.messages ?? []
          this.unread = res.data.unread ?? 0
          this.loaded = true
        }
      } catch {
        // 保留上一次成功的数据；首次失败则维持空收件箱
      } finally {
        this.loading = false
      }
    },

    // 标记单封已读，用后端回传的最新收件箱覆盖本地状态（含重算后的 unread）。
    async markRead(messageId: string) {
      // welcome 是恒为已读的系统问候，无需请求
      if (!messageId || messageId === 'welcome') return
      const target = this.messages.find((m) => m.id === messageId)
      if (target?.read) return

      // 乐观更新：先本地置已读，提升响应感；请求失败则下次 fetch 自愈
      if (target) target.read = true
      this.unread = this.messages.filter((m) => !m.read).length

      try {
        const api = useApiClient()
        const res = await api.post('/mail/read', { message_id: messageId })
        if (res?.success && res.data) {
          this.messages = res.data.messages ?? this.messages
          this.unread = res.data.unread ?? this.unread
        }
      } catch {
        // 乐观更新已生效，忽略网络错误
      }
    },

    // 领取附件奖励。成功后用后端回传的最新收件箱覆盖本地状态。
    async claim(messageId: string): Promise<ClaimResult> {
      try {
        const api = useApiClient()
        const res = await api.post('/mail/claim', { message_id: messageId })
        const data = res?.data ?? {}
        if (res?.success && data.inbox) {
          this.messages = data.inbox.messages ?? this.messages
          this.unread = data.inbox.unread ?? this.unread
        }
        return {
          success: !!res?.success,
          message: res?.message ?? data.message,
          rewards: data.rewards,
        }
      } catch {
        return { success: false, message: '领取失败，请稍后再试' }
      }
    },

    reset() {
      this.messages = []
      this.unread = 0
      this.loaded = false
    },
  },
})
