<template>
  <div class="action-hint-bar">
    <div class="action-sequence">
      <div
        v-for="(action, index) in actions"
        :key="index"
        class="action-item"
        :class="{
          current: index === currentIndex,
          done: index < currentIndex,
          upcoming: index > currentIndex,
        }"
        :style="{ '--action-color': getActionColor(action) }"
      >
        <span class="action-icon">{{ getActionIcon(action) }}</span>
        <span class="action-name">{{ getActionName(action) }}</span>
        <span class="action-key">{{ getActionKey(action) }}</span>
        <div v-if="index === currentIndex" class="timer-ring">
          <svg viewBox="0 0 36 36">
            <circle
              class="timer-bg"
              cx="18" cy="18" r="16"
            />
            <circle
              class="timer-fill"
              cx="18" cy="18" r="16"
              :style="{ strokeDashoffset: 100.5 * (1 - timerRatio) }"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActionType } from '@/types/game'
import { ACTION_DEFS } from '@/game/actions'

defineProps<{
  actions: ActionType[]
  currentIndex: number
  timerRatio: number
}>()

function getActionIcon(type: ActionType): string {
  return ACTION_DEFS[type].icon
}

function getActionName(type: ActionType): string {
  return ACTION_DEFS[type].name
}

function getActionKey(type: ActionType): string {
  const key = ACTION_DEFS[type].key
  if (key === 'Space') return '空格'
  if (key === 'ArrowUp') return '↑'
  if (key === 'ArrowDown') return '↓'
  if (key === 'ArrowLeft') return '←'
  if (key === 'ArrowRight') return '→'
  return key
}

function getActionColor(type: ActionType): string {
  return ACTION_DEFS[type].color
}
</script>

<style scoped>
.action-hint-bar {
  padding: 8px 16px;
  background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  overflow-x: auto;
}

.action-sequence {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: nowrap;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  min-width: 56px;
}

.action-item.current {
  border-color: var(--action-color, #FF6B35);
  background: rgba(255,255,255,0.15);
  transform: scale(1.1);
  box-shadow: 0 0 16px rgba(255,107,53,0.4);
}

.action-item.done {
  opacity: 0.4;
  transform: scale(0.9);
}

.action-item.done .action-icon {
  text-decoration: line-through;
}

.action-item.upcoming {
  opacity: 0.6;
}

.action-icon {
  font-size: 20px;
}

.action-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--action-color, #fff);
}

.action-key {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.1);
  padding: 1px 5px;
  border-radius: 4px;
}

.timer-ring {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
}

.timer-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-bg {
  fill: none;
  stroke: rgba(255,255,255,0.2);
  stroke-width: 3;
}

.timer-fill {
  fill: none;
  stroke: var(--action-color, #4CAF50);
  stroke-width: 3;
  stroke-dasharray: 100.5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
}
</style>
