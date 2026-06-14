import type { ActionDef, ActionType } from '@/types/game'

export const ACTION_DEFS: Record<ActionType, ActionDef> = {
  step: {
    type: 'step',
    name: '踩',
    key: 'ArrowDown',
    icon: '⬇️',
    color: '#FF6B35',
  },
  hook: {
    type: 'hook',
    name: '勾',
    key: 'ArrowUp',
    icon: '⬆️',
    color: '#4CAF50',
  },
  flick: {
    type: 'flick',
    name: '挑',
    key: 'ArrowRight',
    icon: '➡️',
    color: '#2196F3',
  },
  wrap: {
    type: 'wrap',
    name: '绕',
    key: 'ArrowLeft',
    icon: '🔄',
    color: '#9C27B0',
  },
  jump: {
    type: 'jump',
    name: '跳',
    key: 'Space',
    icon: '⏫',
    color: '#FFD700',
  },
}

export function getActionDef(type: ActionType): ActionDef {
  return ACTION_DEFS[type]
}

export function getKeyActionMap(): Record<string, ActionType> {
  const map: Record<string, ActionType> = {}
  for (const [, def] of Object.entries(ACTION_DEFS)) {
    map[def.key] = def.type
  }
  return map
}
