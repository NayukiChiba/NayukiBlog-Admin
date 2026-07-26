<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";

interface Option {
  value: string;
  label: string;
}

interface Props {
  modelValue: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "请选择",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

const selectedLabel = computed(() => {
  const option = props.options.find((opt) => opt.value === props.modelValue);
  return option ? option.label : props.placeholder;
});

const isPlaceholder = computed(() => {
  return !props.options.find((opt) => opt.value === props.modelValue);
});

function updateDropdownPosition() {
  if (!triggerRef.value) return;

  const rect = triggerRef.value.getBoundingClientRect();
  const dropdownHeight = 240; // max-height of dropdown
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  // Determine if dropdown should open upward
  const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

  if (openUpward) {
    dropdownStyle.value = {
      position: "fixed",
      left: `${rect.left}px`,
      bottom: `${window.innerHeight - rect.top + 6}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.min(dropdownHeight, spaceAbove - 10)}px`,
    };
  } else {
    dropdownStyle.value = {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.bottom + 6}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.min(dropdownHeight, spaceBelow - 10)}px`,
    };
  }
}

async function toggleDropdown() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;

  if (isOpen.value) {
    await nextTick();
    updateDropdownPosition();
  }
}

function selectOption(option: Option) {
  emit("update:modelValue", option.value);
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    // Also check if click is on the dropdown (which is teleported)
    const dropdown = document.querySelector(
      ".custom-select-dropdown-teleported",
    );
    if (dropdown && dropdown.contains(event.target as Node)) {
      return;
    }
    isOpen.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    isOpen.value = false;
  }
}

function handleScroll() {
  if (isOpen.value) {
    updateDropdownPosition();
  }
}

function handleResize() {
  if (isOpen.value) {
    updateDropdownPosition();
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("scroll", handleScroll, true);
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <div
    ref="selectRef"
    class="custom-select"
    :class="{ open: isOpen, disabled: disabled }"
  >
    <div ref="triggerRef" class="select-trigger" @click="toggleDropdown">
      <span class="select-value" :class="{ placeholder: isPlaceholder }">
        {{ selectedLabel }}
      </span>
      <svg
        class="select-arrow"
        :class="{ rotated: isOpen }"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>

    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          class="select-dropdown custom-select-dropdown-teleported"
          :style="dropdownStyle"
        >
          <div
            v-for="option in options"
            :key="option.value"
            class="select-option"
            :class="{ selected: option.value === modelValue }"
            @click="selectOption(option)"
          >
            <span class="option-label">{{ option.label }}</span>
            <svg
              v-if="option.value === modelValue"
              class="option-check"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
  font-size: 14px;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: white;
  border: 1px solid #e3e6f0;
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.custom-select:not(.disabled) .select-trigger:hover {
  border-color: #bcc8d9;
  background-color: #fafbff;
}

/* 打开状态：主题描边 + 光环 */
.custom-select.open .select-trigger {
  border-color: #4c5670;
  box-shadow: 0 0 0 3px rgba(76, 86, 112, 0.14);
}

.custom-select.disabled .select-trigger {
  background-color: #eef0f8;
  cursor: not-allowed;
  opacity: 0.7;
}

.select-value {
  flex: 1;
  color: #14161f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-value.placeholder {
  color: #8b91a5;
}

.select-arrow {
  flex-shrink: 0;
  color: #4c5670;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  margin-left: 8px;
}

.select-arrow.rotated {
  transform: rotate(180deg);
}

.custom-select.disabled .select-arrow {
  color: #8b91a5;
}

@media (prefers-reduced-motion: reduce) {
  .select-trigger,
  .select-arrow {
    transition: none;
  }
}
</style>

<style>
/* Global styles for teleported dropdown */
.select-dropdown.custom-select-dropdown-teleported {
  background: white;
  border: 1px solid #e3e6f0;
  border-radius: 12px;
  box-shadow:
    0 1px 2px rgba(23, 25, 35, 0.04),
    0 16px 40px -12px rgba(23, 25, 35, 0.18);
  z-index: 9999;
  overflow: hidden;
  overflow-y: auto;
}

.select-dropdown.custom-select-dropdown-teleported .select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition:
    background-color 0.15s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.15s cubic-bezier(0.22, 1, 0.36, 1);
  font-size: 14px;
  color: #14161f;
}

.select-dropdown.custom-select-dropdown-teleported .select-option:hover {
  background: #eaeef4;
  color: #4c5670;
}

/* 选中项：雾蓝纯色底 + 白字 */
.select-dropdown.custom-select-dropdown-teleported .select-option.selected {
  background: #4c5670;
  color: white;
}

.select-dropdown.custom-select-dropdown-teleported .option-label {
  flex: 1;
}

.select-dropdown.custom-select-dropdown-teleported .option-check {
  flex-shrink: 0;
  margin-left: 8px;
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: top center;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.94) translateY(-5px);
}

/* Custom scrollbar for dropdown */
.select-dropdown.custom-select-dropdown-teleported::-webkit-scrollbar {
  width: 6px;
}

.select-dropdown.custom-select-dropdown-teleported::-webkit-scrollbar-track {
  background: #f4f5fa;
  border-radius: 3px;
}

.select-dropdown.custom-select-dropdown-teleported::-webkit-scrollbar-thumb {
  background: #cdd2e0;
  border-radius: 3px;
}

.select-dropdown.custom-select-dropdown-teleported::-webkit-scrollbar-thumb:hover {
  background: #bcc8d9;
}

@media (prefers-reduced-motion: reduce) {
  .select-dropdown.custom-select-dropdown-teleported .select-option,
  .dropdown-enter-active,
  .dropdown-leave-active {
    transition: none;
  }
}
</style>
