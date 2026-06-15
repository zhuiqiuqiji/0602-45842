<template>
  <div class="pattern-editor">
    <div class="editor-content">
      <h1 class="page-title">花样编辑器</h1>

      <div class="card">
        <label class="field-label">花样名称</label>
        <input
          v-model="patternName"
          class="name-input"
          type="text"
          placeholder="输入花样名称"
          maxlength="20"
        />
      </div>

      <div class="card">
        <label class="field-label">难度选择</label>
        <div class="difficulty-options">
          <button
            v-for="d in difficulties"
            :key="d.value"
            class="diff-btn"
            :class="{ selected: selectedDifficulty === d.value }"
            :style="{ '--diff-color': d.color }"
            @click="selectedDifficulty = d.value"
          >
            <span class="diff-icon">{{ d.icon }}</span>
            <span class="diff-name">{{ d.name }}</span>
          </button>
        </div>
      </div>

      <div class="card">
        <label class="field-label">动作序列</label>
        <div class="action-buttons">
          <button
            v-for="action in actionList"
            :key="action.type"
            class="action-btn"
            :style="{ '--action-color': action.color }"
            @click="addAction(action.type)"
          >
            <span class="action-icon">{{ action.icon }}</span>
            <span class="action-name">{{ action.name }}</span>
            <span class="action-key">{{ action.keyLabel }}</span>
          </button>
        </div>

        <div class="sequence-area" v-if="sequence.length > 0">
          <div class="sequence-header">
            <span class="sequence-label">当前序列 ({{ sequence.length }})</span>
            <button class="clear-btn" @click="sequence = []">清空</button>
          </div>
          <div class="sequence-list">
            <div
              v-for="(item, index) in sequence"
              :key="index"
              class="sequence-item"
              :style="{ '--item-color': ACTION_DEFS[item].color }"
            >
              <span class="seq-icon">{{ ACTION_DEFS[item].icon }}</span>
              <span class="seq-name">{{ ACTION_DEFS[item].name }}</span>
              <div class="seq-controls">
                <button
                  class="seq-ctrl-btn"
                  :disabled="index === 0"
                  @click="moveUp(index)"
                >↑</button>
                <button
                  class="seq-ctrl-btn"
                  :disabled="index === sequence.length - 1"
                  @click="moveDown(index)"
                >↓</button>
                <button class="seq-del-btn" @click="removeAction(index)">✕</button>
              </div>
            </div>
          </div>
        </div>
        <div class="empty-hint" v-else>点击上方按钮添加动作</div>
      </div>

      <div class="card">
        <label class="field-label">参数设置</label>
        <div class="param-row">
          <span class="param-name">每拍时间</span>
          <input
            v-model.number="timePerAction"
            class="param-slider"
            type="range"
            min="1000"
            max="5000"
            step="100"
          />
          <span class="param-value">{{ (timePerAction / 1000).toFixed(1) }}s</span>
        </div>
        <div class="param-row">
          <span class="param-name">最大失误数</span>
          <input
            v-model.number="maxMistakes"
            class="param-slider"
            type="range"
            min="1"
            max="8"
            step="1"
          />
          <span class="param-value">{{ maxMistakes }}</span>
        </div>
      </div>

      <div class="card">
        <label class="field-label">动画预览</label>
        <div class="preview-wrapper">
          <canvas ref="previewCanvas" class="preview-canvas" width="700" height="200"></canvas>
          <div class="preview-controls">
            <button class="preview-btn" @click="startPreview">▶ 播放</button>
            <button class="preview-btn" @click="stopPreview">⏹ 停止</button>
          </div>
        </div>
      </div>

      <div class="card actions-row">
        <button class="save-btn" @click="savePattern" :disabled="!canSave">💾 保存花样</button>
        <button class="back-btn" @click="router.push({ name: 'start' })">← 返回</button>
      </div>

      <div v-if="saveMsg" class="save-msg">{{ saveMsg }}</div>

      <div class="card" v-if="savedPatterns.length > 0">
        <label class="field-label">已保存花样</label>
        <div class="saved-list">
          <div v-for="p in savedPatterns" :key="p.id" class="saved-item">
            <div class="saved-info">
              <span class="saved-name">{{ p.name }}</span>
              <span class="saved-detail">{{ difficultyLabel(p.difficulty) }} · {{ p.actions.length }}个动作</span>
            </div>
            <div class="saved-actions">
              <button class="saved-btn edit-btn" @click="editPattern(p)">编辑</button>
              <button class="saved-btn del-btn" @click="deletePattern(p.id)">删除</button>
              <button class="saved-btn play-btn" @click="playPattern(p)">开始游戏</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ActionType, Difficulty, CustomPattern } from '@/types/game'
import { ACTION_DEFS } from '@/game/actions'

const router = useRouter()

const patternName = ref('')
const selectedDifficulty = ref<Difficulty>('normal')
const sequence = ref<ActionType[]>([])
const timePerAction = ref(2000)
const maxMistakes = ref(3)
const saveMsg = ref('')
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const savedPatterns = ref<CustomPattern[]>([])

let previewAnimId = 0

const difficulties = [
  { value: 'easy' as Difficulty, name: '简单', icon: '🌟', color: '#4CAF50' },
  { value: 'normal' as Difficulty, name: '普通', icon: '⭐', color: '#FF6B35' },
  { value: 'hard' as Difficulty, name: '困难', icon: '🔥', color: '#F44336' },
]

const actionList = [
  { ...ACTION_DEFS.step, keyLabel: '↓', color: ACTION_DEFS.step.color },
  { ...ACTION_DEFS.hook, keyLabel: '↑', color: ACTION_DEFS.hook.color },
  { ...ACTION_DEFS.flick, keyLabel: '→', color: ACTION_DEFS.flick.color },
  { ...ACTION_DEFS.wrap, keyLabel: '←', color: ACTION_DEFS.wrap.color },
  { ...ACTION_DEFS.jump, keyLabel: '空格', color: ACTION_DEFS.jump.color },
]

const canSave = computed(() => patternName.value.trim() !== '' && sequence.value.length > 0)

function addAction(type: ActionType) {
  sequence.value.push(type)
}

function removeAction(index: number) {
  sequence.value.splice(index, 1)
}

function moveUp(index: number) {
  if (index <= 0) return
  const arr = [...sequence.value]
  ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
  sequence.value = arr
}

function moveDown(index: number) {
  if (index >= sequence.value.length - 1) return
  const arr = [...sequence.value]
  ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
  sequence.value = arr
}

function difficultyLabel(d: Difficulty) {
  return difficulties.find(x => x.value === d)?.name ?? d
}

function loadPatterns() {
  try {
    const raw = localStorage.getItem('customPatterns')
    if (raw) {
      savedPatterns.value = JSON.parse(raw)
    }
  } catch {
    savedPatterns.value = []
  }
}

function persistPatterns() {
  localStorage.setItem('customPatterns', JSON.stringify(savedPatterns.value))
}

function savePattern() {
  if (!canSave.value) return
  const now = Date.now()
  const pattern: CustomPattern = {
    id: now.toString(36) + Math.random().toString(36).slice(2, 6),
    name: patternName.value.trim(),
    actions: [...sequence.value],
    difficulty: selectedDifficulty.value,
    timePerAction: timePerAction.value,
    maxMistakes: maxMistakes.value,
    createdAt: now,
    updatedAt: now,
  }
  savedPatterns.value.push(pattern)
  persistPatterns()
  saveMsg.value = '保存成功！'
  setTimeout(() => { saveMsg.value = '' }, 2000)
  patternName.value = ''
  sequence.value = []
}

function editPattern(p: CustomPattern) {
  patternName.value = p.name
  selectedDifficulty.value = p.difficulty
  sequence.value = [...p.actions]
  timePerAction.value = p.timePerAction
  maxMistakes.value = p.maxMistakes
  const idx = savedPatterns.value.findIndex(x => x.id === p.id)
  if (idx >= 0) {
    savedPatterns.value.splice(idx, 1)
    persistPatterns()
  }
}

function deletePattern(id: string) {
  savedPatterns.value = savedPatterns.value.filter(x => x.id !== id)
  persistPatterns()
}

function playPattern(p: CustomPattern) {
  router.push({ name: 'game', query: { mode: 'custom', patternId: p.id } })
}

function startPreview() {
  stopPreview()
  if (sequence.value.length === 0) return
  const canvas = previewCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const seq = [...sequence.value]
  const total = seq.length
  const beatMs = timePerAction.value
  const startTime = performance.now()

  function draw(now: number) {
    const elapsed = now - startTime
    const totalMs = total * beatMs
    const loopElapsed = elapsed % (totalMs + beatMs)
    const currentIdx = Math.floor(loopElapsed / beatMs)
    const progress = (loopElapsed % beatMs) / beatMs

    const w = canvas!.width
    const h = canvas!.height
    ctx!.clearRect(0, 0, w, h)

    ctx!.fillStyle = 'rgba(10,15,40,0.6)'
    ctx!.fillRect(0, 0, w, h)

    const itemW = 60
    const gap = 16
    const totalW = total * itemW + (total - 1) * gap
    const startX = (w - totalW) / 2
    const cy = h / 2

    for (let i = 0; i < total; i++) {
      const x = startX + i * (itemW + gap)
      const def = ACTION_DEFS[seq[i]]
      const isActive = i === currentIdx && loopElapsed < totalMs

      ctx!.fillStyle = isActive ? def.color : 'rgba(255,255,255,0.12)'
      const r = 10
      ctx!.beginPath()
      ctx!.roundRect(x, cy - 24, itemW, 48, r)
      ctx!.fill()

      if (isActive) {
        ctx!.shadowColor = def.color
        ctx!.shadowBlur = 16
        ctx!.fillStyle = def.color
        ctx!.beginPath()
        ctx!.roundRect(x, cy - 24, itemW, 48, r)
        ctx!.fill()
        ctx!.shadowBlur = 0
      }

      ctx!.fillStyle = isActive ? '#fff' : 'rgba(255,255,255,0.7)'
      ctx!.font = '20px sans-serif'
      ctx!.textAlign = 'center'
      ctx!.textBaseline = 'middle'
      ctx!.fillText(def.icon, x + itemW / 2, cy - 2)

      ctx!.font = '10px sans-serif'
      ctx!.fillText(def.name, x + itemW / 2, cy + 18)
    }

    if (loopElapsed < totalMs) {
      const activeX = startX + currentIdx * (itemW + gap) + itemW / 2
      const indicatorY = cy - 34 - Math.sin(progress * Math.PI) * 12
      ctx!.fillStyle = '#FFD700'
      ctx!.beginPath()
      ctx!.arc(activeX, indicatorY, 5, 0, Math.PI * 2)
      ctx!.fill()
    }

    previewAnimId = requestAnimationFrame(draw)
  }

  previewAnimId = requestAnimationFrame(draw)
}

function stopPreview() {
  if (previewAnimId) {
    cancelAnimationFrame(previewAnimId)
    previewAnimId = 0
  }
  const canvas = previewCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(10,15,40,0.6)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('点击"播放"预览动作序列', canvas.width / 2, canvas.height / 2)
}

onMounted(() => {
  loadPatterns()
  stopPreview()
})
</script>

<style scoped>
.pattern-editor {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #0d47a1 100%);
  padding: 24px 16px;
  box-sizing: border-box;
}

.editor-content {
  max-width: 800px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-title {
  text-align: center;
  font-size: 32px;
  font-weight: 900;
  color: #fff;
  margin: 0;
  letter-spacing: 4px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.3);
}

.card {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.12);
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.8);
  margin-bottom: 12px;
  letter-spacing: 2px;
}

.name-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.name-input:focus {
  border-color: #FFD700;
}

.name-input::placeholder {
  color: rgba(255,255,255,0.35);
}

.difficulty-options {
  display: flex;
  gap: 12px;
}

.diff-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  cursor: pointer;
  transition: all 0.3s;
  color: #fff;
}

.diff-btn:hover {
  background: rgba(255,255,255,0.14);
}

.diff-btn.selected {
  border-color: var(--diff-color);
  background: rgba(255,255,255,0.15);
  box-shadow: 0 0 16px rgba(255,255,255,0.1);
}

.diff-icon { font-size: 22px; }
.diff-name { font-size: 14px; font-weight: 700; }

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 14px;
  border: 2px solid var(--action-color);
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  cursor: pointer;
  transition: all 0.3s;
  color: #fff;
  min-width: 64px;
}

.action-btn:hover {
  background: var(--action-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.3);
}

.action-icon { font-size: 20px; }
.action-name { font-size: 13px; font-weight: 700; color: var(--action-color); }
.action-btn:hover .action-name { color: #fff; }
.action-key { font-size: 10px; color: rgba(255,255,255,0.5); }

.sequence-area {
  margin-top: 14px;
}

.sequence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sequence-label {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
}

.clear-btn {
  padding: 4px 12px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  background: rgba(244,67,54,0.2);
  color: #ff8a80;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(244,67,54,0.4);
}

.sequence-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sequence-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.08);
  border-radius: 8px;
  border: 1px solid var(--item-color);
}

.seq-icon { font-size: 16px; }
.seq-name { font-size: 13px; font-weight: 600; color: var(--item-color); }

.seq-controls {
  display: flex;
  gap: 2px;
}

.seq-ctrl-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.seq-ctrl-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.25);
}

.seq-ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.seq-del-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: rgba(244,67,54,0.25);
  color: #ff8a80;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.seq-del-btn:hover {
  background: rgba(244,67,54,0.5);
}

.empty-hint {
  text-align: center;
  color: rgba(255,255,255,0.35);
  font-size: 13px;
  margin-top: 12px;
  padding: 16px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.param-row:last-child {
  margin-bottom: 0;
}

.param-name {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  min-width: 72px;
}

.param-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.15);
  outline: none;
}

.param-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #FFD700;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(255,215,0,0.5);
}

.param-value {
  font-size: 13px;
  font-weight: 700;
  color: #FFD700;
  min-width: 40px;
  text-align: right;
}

.preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.preview-canvas {
  width: 100%;
  max-width: 700px;
  height: 200px;
  border-radius: 10px;
  background: rgba(10,15,40,0.6);
}

.preview-controls {
  display: flex;
  gap: 10px;
}

.preview-btn {
  padding: 6px 18px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn:hover {
  background: rgba(255,255,255,0.2);
}

.actions-row {
  display: flex;
  gap: 12px;
}

.save-btn {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #FF6B35, #E65100);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(255,107,53,0.4);
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255,107,53,0.5);
}

.save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.back-btn {
  padding: 12px 24px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255,255,255,0.15);
}

.save-msg {
  text-align: center;
  color: #4CAF50;
  font-size: 14px;
  font-weight: 700;
  padding: 8px;
  animation: msg-fade 0.3s ease;
}

@keyframes msg-fade {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.saved-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.saved-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(255,255,255,0.06);
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
}

.saved-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.saved-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.saved-detail {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}

.saved-actions {
  display: flex;
  gap: 6px;
}

.saved-btn {
  padding: 5px 12px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.saved-btn:hover {
  background: rgba(255,255,255,0.2);
}

.edit-btn {
  border-color: #2196F3;
  color: #64B5F6;
}

.play-btn {
  border-color: #4CAF50;
  color: #81C784;
}

.del-btn {
  border-color: #F44336;
  color: #E57373;
}

@media (max-width: 480px) {
  .action-buttons {
    gap: 6px;
  }

  .action-btn {
    padding: 8px 10px;
    min-width: 54px;
  }

  .difficulty-options {
    gap: 8px;
  }

  .saved-item {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .saved-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
