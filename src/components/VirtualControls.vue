<template>
  <div class="virtual-controls">
    <button
      v-for="action in actions"
      :key="action.type"
      class="ctrl-btn"
      :class="'ctrl-' + action.type"
      :style="{ '--btn-color': action.color }"
      @touchstart.prevent="onAction(action.type)"
      @mousedown.prevent="onAction(action.type)"
    >
      <span class="ctrl-icon">{{ action.icon }}</span>
      <span class="ctrl-name">{{ action.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ActionType } from '@/types/game'
import { ACTION_DEFS } from '@/game/actions'

const emit = defineEmits<{
  action: [type: ActionType]
}>()

const actions = Object.values(ACTION_DEFS)

function onAction(type: ActionType) {
  emit('action', type)
}
</script>

<style scoped>
.virtual-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 12px;
  flex-wrap: wrap;
}

.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 18px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(145deg, var(--btn-color), rgba(0,0,0,0.3));
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow:
    0 4px 8px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.2);
  min-width: 64px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.ctrl-btn:active {
  transform: scale(0.92) translateY(2px);
  box-shadow:
    0 2px 4px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.1);
}

.ctrl-icon {
  font-size: 24px;
}

.ctrl-name {
  font-size: 13px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
</style>
