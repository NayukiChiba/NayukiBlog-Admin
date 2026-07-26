<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  title: string;
  width?: string;
  closeOnClickOutside?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

function onOverlayClick() {
  if (props.closeOnClickOutside !== true) return;
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-overlay"
      @click.self="onOverlayClick()"
    >
      <div class="modal" :style="{ maxWidth: width || '500px' }">
        <div class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <div class="modal-footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 17, 28, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: overlayIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal {
  position: relative;
  background: white;
  border-radius: 20px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 1px 2px rgba(23, 25, 35, 0.04),
    0 24px 60px -16px rgba(23, 25, 35, 0.28);
  animation: modalIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes overlayIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid #edeff7;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #14161f;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #8b91a5;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.close-btn:hover {
  background: #eaeef4;
  color: #4c5670;
  transform: rotate(90deg);
}

.modal-body {
  padding: 20px 22px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 22px;
  border-top: 1px solid #edeff7;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-footer:empty {
  display: none;
}

@media (max-width: 640px) {
  .modal {
    max-height: 100vh;
    height: 100%;
    border-radius: 0;
  }

  .modal-overlay {
    padding: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-overlay,
  .modal {
    animation: none;
  }

  .close-btn {
    transition: none;
  }

  .close-btn:hover {
    transform: none;
  }
}
</style>
