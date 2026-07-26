<script setup lang="ts">
defineProps<{
  icon?: string;
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="empty-state">
    <!-- 几何装饰：描边圆环 + 十字 + 圆点 -->
    <div class="empty-decor" aria-hidden="true">
      <span class="decor-ring"></span>
      <span class="decor-ring decor-ring-dashed"></span>
      <span class="decor-cross"></span>
      <span class="decor-dot"></span>
    </div>
    <svg
      v-if="!icon"
      class="empty-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
    <span v-else class="empty-emoji">{{ icon }}</span>
    <p v-if="title" class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <div class="empty-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  text-align: center;
  color: #8b91a5;
  animation: emptyIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes emptyIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 几何装饰层 ===== */
.empty-decor {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 132px;
  height: 132px;
  pointer-events: none;
}

/* 描边圆环 */
.decor-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(20, 22, 31, 0.06);
}

/* 虚线圆环（中性灰描边），缓慢旋转 */
.decor-ring-dashed {
  inset: 14px;
  border: 1.5px dashed rgba(20, 22, 31, 0.14);
  animation: decorSpin 46s linear infinite;
}

@keyframes decorSpin {
  to {
    transform: rotate(360deg);
  }
}

/* 十字标记 */
.decor-cross {
  position: absolute;
  top: 6px;
  right: -26px;
  width: 12px;
  height: 12px;
}

.decor-cross::before,
.decor-cross::after {
  content: '';
  position: absolute;
  background: rgba(20, 22, 31, 0.16);
}

.decor-cross::before {
  left: 50%;
  top: 0;
  width: 1.5px;
  height: 100%;
}

.decor-cross::after {
  top: 50%;
  left: 0;
  width: 100%;
  height: 1.5px;
}

/* 淡雾蓝圆点 */
.decor-dot {
  position: absolute;
  bottom: 12px;
  left: -20px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(147, 169, 201, 0.7);
}

/* ===== 内容 ===== */
.empty-icon {
  position: relative;
  width: 64px;
  height: 64px;
  color: #cdd2e0;
  margin-bottom: 16px;
}

.empty-emoji {
  position: relative;
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  position: relative;
  font-size: 16px;
  font-weight: 500;
  color: #4e5567;
  margin: 0 0 8px 0;
}

.empty-description {
  position: relative;
  font-size: 14px;
  color: #8b91a5;
  margin: 0 0 16px 0;
  max-width: 300px;
}

.empty-actions {
  position: relative;
  display: flex;
  gap: 12px;
}

.empty-actions:empty {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .empty-state,
  .decor-ring-dashed {
    animation: none;
  }
}
</style>
