import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useSidebarStore = defineStore('sidebar', () => {
  // Sidebar 是否展开（移动端使用）
  const isOpen = ref(false)

  // 切换 Sidebar 状态
  function toggle() {
    isOpen.value = !isOpen.value
  }

  // 打开 Sidebar
  function open() {
    isOpen.value = true
  }

  // 关闭 Sidebar
  function close() {
    isOpen.value = false
  }

  return {
    isOpen,
    toggle,
    open,
    close,
  }
})
