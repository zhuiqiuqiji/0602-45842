<template>
  <div class="hud-container">
    <div class="hud-section">
      <div class="hud-level">
        <span class="hud-label">关卡</span>
        <span class="hud-value level-value">{{ level }}</span>
      </div>
      <div class="hud-height">{{ heightLabel }}</div>
    </div>

    <div class="hud-section hud-center">
      <div class="hud-score">
        <span class="hud-label">分数</span>
        <span class="hud-value score-value">{{ score }}</span>
      </div>
      <div v-if="combo > 1" class="hud-combo">
        <span class="combo-text">{{ combo }}连击!</span>
      </div>
    </div>

    <div class="hud-section hud-right">
      <div class="hud-lives">
        <span v-for="i in maxLives" :key="i" class="heart" :class="{ lost: i > lives }">
          {{ i > lives ? '♡' : '♥' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  level: number
  heightLabel: string
  score: number
  combo: number
  lives: number
  maxLives: number
}>()
</script>

<style scoped>
.hud-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 100%);
  border-radius: 12px;
  color: white;
  font-family: 'Segoe UI', sans-serif;
  backdrop-filter: blur(8px);
  min-height: 52px;
}

.hud-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hud-center {
  flex: 1;
}

.hud-right {
  align-items: flex-end;
}

.hud-label {
  font-size: 11px;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hud-value {
  font-size: 22px;
  font-weight: 800;
}

.level-value {
  color: #FF6B35;
}

.score-value {
  color: #FFD700;
  font-size: 28px;
}

.hud-height {
  font-size: 12px;
  color: #FF69B4;
  font-weight: 600;
}

.hud-combo {
  margin-top: 2px;
}

.combo-text {
  font-size: 14px;
  font-weight: 700;
  color: #FF6B35;
  animation: combo-pulse 0.3s ease;
}

.hud-lives {
  display: flex;
  gap: 4px;
}

.heart {
  font-size: 20px;
  color: #F44336;
  transition: all 0.3s ease;
}

.heart.lost {
  color: #555;
  transform: scale(0.8);
}

@keyframes combo-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
</style>
