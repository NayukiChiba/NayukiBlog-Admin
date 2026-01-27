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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.custom-select:not(.disabled) .select-trigger:hover {
  border-color: #a5b4fc;
  background-color: #fafbff;
}

.custom-select.open .select-trigger {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.custom-select.disabled .select-trigger {
  background-color: #f1f5f9;
  cursor: not-allowed;
  opacity: 0.7;
}

.select-value {
  flex: 1;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-value.placeholder {
  color: #9ca3af;
}

.select-arrow {
  flex-shrink: 0;
  color: #6366f1;
  transition: transform 0.2s ease;
  margin-left: 8px;
}

.select-arrow.rotated {
  transform: rotate(180deg);
}

.custom-select.disabled .select-arrow {
  color: #94a3b8;
}
</style>

<style>
/* Global styles for teleported dropdown */
.select-dropdown.custom-select-dropdown-teleported {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
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
  transition: all 0.15s ease;
  font-size: 14px;
  color: #1f2937;
}

.select-dropdown.custom-select-dropdown-teleported .select-option:hover {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
}

.select-dropdown.custom-select-dropdown-teleported .select-option.selected {
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
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
  transition: all 0.2s ease;
  transform-origin: top center;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.9) translateY(-4px);
}

/* Custom scrollbar for dropdown */
.select-dropdown.custom-select-dropdown-teleported::-webkit-scrollbar {
  width: 6px;
}

.select-dropdown.custom-select-dropdown-teleported::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.select-dropdown.custom-select-dropdown-teleported::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.select-dropdown.custom-select-dropdown-teleported::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
