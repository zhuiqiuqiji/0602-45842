import type { ActionType, CharacterRenderState, RubberBandState, RhythmGrade, RhythmConfig, ElasticBandConfig, HeightObstacle } from '@/types/game'

export const GROUND_Y = 440
export const CANVAS_W = 960
export const CANVAS_H = 540

export interface PlayerFeet {
  leftFootX: number
  leftFootY: number
  rightFootX: number
  rightFootY: number
}

export interface CollisionResult {
  distance: number
  footX: number
  footY: number
  bandX: number
  bandY: number
  collided: boolean
  collisionType: 'none' | 'touch' | 'hook' | 'flick' | 'wrap' | 'jump_over'
  elasticResponse: ElasticResponse
}

export interface ElasticResponse {
  reboundForce: number
  stretchAmount: number
  bandVelocity: number
  deformationX: number
}

export const DEFAULT_ELASTIC_CONFIG: ElasticBandConfig = {
  stiffness: 0.15,
  damping: 0.08,
  maxStretch: 40,
  recoilSpeed: 0.12,
}

export const HEIGHT_LEVELS: HeightObstacle[] = [
  { minHeight: 0, maxHeight: 30, label: '脚踝', requiredJumpHeight: 20 },
  { minHeight: 30, maxHeight: 70, label: '小腿', requiredJumpHeight: 50 },
  { minHeight: 70, maxHeight: 110, label: '膝盖', requiredJumpHeight: 90 },
  { minHeight: 110, maxHeight: 150, label: '大腿', requiredJumpHeight: 130 },
  { minHeight: 150, maxHeight: 190, label: '腰部', requiredJumpHeight: 170 },
  { minHeight: 190, maxHeight: 240, label: '胸部', requiredJumpHeight: 220 },
  { minHeight: 240, maxHeight: 290, label: '肩部', requiredJumpHeight: 270 },
  { minHeight: 290, maxHeight: 340, label: '颈部', requiredJumpHeight: 320 },
]

export const DEFAULT_RHYTHM_CONFIG: RhythmConfig = {
  bpm: 120,
  windowPerfect: 50,
  windowGood: 100,
  windowEarly: 150,
  windowLate: 150,
}

export function getPlayerFeetPositions(player: CharacterRenderState): PlayerFeet {
  const baseY = GROUND_Y - player.jumpHeight
  const x = player.x
  const legH = 38
  let leftLegAngle = 0
  let rightLegAngle = 0

  switch (player.state) {
    case 'stepping':
      rightLegAngle = 45 + player.animProgress * 20
      break
    case 'hooking':
      rightLegAngle = -60 - player.animProgress * 30
      break
    case 'flicking':
      rightLegAngle = -30 + player.animProgress * 80
      break
    case 'wrapping':
      rightLegAngle = Math.sin(player.animProgress * Math.PI * 2) * 40
      break
    case 'jumping':
      leftLegAngle = -20
      rightLegAngle = 20
      break
    case 'idle':
    default:
      leftLegAngle = 0
      rightLegAngle = 0
      break
  }

  const legTopY = baseY - legH
  const leftRad = (leftLegAngle * Math.PI) / 180
  const rightRad = (rightLegAngle * Math.PI) / 180

  return {
    leftFootX: x - 6 + Math.sin(leftRad) * legH,
    leftFootY: legTopY + Math.cos(leftRad) * legH,
    rightFootX: x + 6 + Math.sin(rightRad) * legH,
    rightFootY: legTopY + Math.cos(rightRad) * legH,
  }
}

export function getRubberBandYAtX(band: RubberBandState, x: number, time: number): number {
  if (x < band.leftX || x > band.rightX) {
    return -9999
  }
  const t = (x - band.leftX) / (band.rightX - band.leftX)
  const sag = Math.sin(t * Math.PI) * 15
  const wobble = band.wobble * Math.sin(t * Math.PI * 4 + time * 0.01)
  const stretchOffset = band.stretchX * Math.sin(t * Math.PI)
  return band.y + sag + wobble + stretchOffset
}

export function checkFootRubberBandCollision(
  player: CharacterRenderState,
  band: RubberBandState,
  action: ActionType,
  time: number
): CollisionResult {
  const feet = getPlayerFeetPositions(player)
  const useRightFoot = ['stepping', 'hooking', 'flicking', 'wrapping'].includes(player.state)
  const footX = useRightFoot ? feet.rightFootX : feet.leftFootX
  const footY = useRightFoot ? feet.rightFootY : feet.leftFootY

  let bandY = getRubberBandYAtX(band, footX, time)
  if (bandY < -9000) {
    bandY = band.y
  }

  const bandX = footX
  const dx = footX - bandX
  const dy = footY - bandY
  const distance = Math.sqrt(dx * dx + dy * dy)

  const tolerance = getActionTolerance(action)

  let collided = false
  let collisionType: CollisionResult['collisionType'] = 'none'

  switch (action) {
    case 'step':
      if (footY >= bandY - tolerance && footY <= bandY + tolerance &&
          footX >= band.leftX - 10 && footX <= band.rightX + 10) {
        collided = true
        collisionType = 'touch'
      }
      break
    case 'hook':
      if (footY <= bandY + tolerance && footY >= bandY - tolerance * 2 &&
          footX >= band.leftX - 10 && footX <= band.rightX + 10) {
        collided = true
        collisionType = 'hook'
      }
      break
    case 'flick':
      if (Math.abs(footY - bandY) <= tolerance * 1.5 &&
          footX >= band.leftX - 10 && footX <= band.rightX + 10) {
        collided = true
        collisionType = 'flick'
      }
      break
    case 'wrap':
      if (distance <= tolerance * 2 &&
          footX >= band.leftX - 10 && footX <= band.rightX + 10) {
        collided = true
        collisionType = 'wrap'
      }
      break
    case 'jump':
      if (player.jumpHeight > 40 && footY < bandY - 10) {
        collided = true
        collisionType = 'jump_over'
      }
      break
  }

  const elasticResponse = collided
    ? computeElasticResponse(band, footY, bandY, action)
    : { reboundForce: 0, stretchAmount: 0, bandVelocity: 0, deformationX: 0 }

  return {
    distance,
    footX,
    footY,
    bandX,
    bandY,
    collided,
    collisionType,
    elasticResponse,
  }
}

function computeElasticResponse(
  band: RubberBandState,
  footY: number,
  bandY: number,
  action: ActionType
): ElasticResponse {
  const config = DEFAULT_ELASTIC_CONFIG
  const penetration = Math.abs(footY - bandY)

  let stretchAmount = Math.min(penetration * config.stiffness, config.maxStretch)
  let reboundForce = stretchAmount * band.elasticity
  let bandVelocity = 0
  let deformationX = 0

  switch (action) {
    case 'step':
      stretchAmount = Math.min(penetration * config.stiffness * 1.2, config.maxStretch)
      reboundForce = stretchAmount * band.elasticity * 1.5
      bandVelocity = reboundForce * config.recoilSpeed
      deformationX = 0
      break
    case 'hook':
      stretchAmount = Math.min(penetration * config.stiffness * 0.8, config.maxStretch * 0.6)
      reboundForce = stretchAmount * band.elasticity * 0.7
      bandVelocity = -reboundForce * config.recoilSpeed * 0.5
      deformationX = Math.min(penetration * 0.3, 15)
      break
    case 'flick':
      stretchAmount = Math.min(penetration * config.stiffness * 0.5, config.maxStretch * 0.4)
      reboundForce = stretchAmount * band.elasticity * 2.0
      bandVelocity = reboundForce * config.recoilSpeed * 2.0
      deformationX = 0
      break
    case 'wrap':
      stretchAmount = Math.min(penetration * config.stiffness * 1.0, config.maxStretch * 0.8)
      reboundForce = stretchAmount * band.elasticity * 0.5
      bandVelocity = -reboundForce * config.recoilSpeed * 0.3
      deformationX = Math.min(penetration * 0.5, 20)
      break
    case 'jump':
      stretchAmount = Math.min(penetration * config.stiffness * 0.3, config.maxStretch * 0.2)
      reboundForce = stretchAmount * band.elasticity * 0.3
      bandVelocity = reboundForce * config.recoilSpeed * 0.5
      deformationX = 0
      break
  }

  const dampingFactor = 1.0 - config.damping
  reboundForce *= dampingFactor
  bandVelocity *= dampingFactor

  return {
    reboundForce,
    stretchAmount,
    bandVelocity,
    deformationX,
  }
}

function getActionTolerance(action: ActionType): number {
  switch (action) {
    case 'step': return 18
    case 'hook': return 20
    case 'flick': return 22
    case 'wrap': return 28
    case 'jump': return 35
  }
}

export function getActionCollisionQuality(distance: number, action: ActionType): 'perfect' | 'good' | 'miss' {
  const tolerance = getActionTolerance(action)
  if (distance <= tolerance * 0.5) return 'perfect'
  if (distance <= tolerance * 1.2) return 'good'
  return 'miss'
}

export function applyElasticCollision(
  band: RubberBandState,
  force: number,
  action: ActionType
): RubberBandState {
  const config = DEFAULT_ELASTIC_CONFIG
  const newBand = { ...band }

  let stretchDirection = 1
  let velocityMultiplier = 1

  switch (action) {
    case 'step':
      stretchDirection = 1
      velocityMultiplier = 1.5
      break
    case 'hook':
      stretchDirection = -1
      velocityMultiplier = 0.5
      break
    case 'flick':
      stretchDirection = -1
      velocityMultiplier = 2.0
      break
    case 'wrap':
      stretchDirection = 1
      velocityMultiplier = 0.3
      break
    case 'jump':
      stretchDirection = -1
      velocityMultiplier = 0.5
      break
  }

  const appliedForce = force * band.elasticity
  newBand.stretchX = Math.max(
    -config.maxStretch,
    Math.min(config.maxStretch, band.stretchX + appliedForce * stretchDirection * config.stiffness)
  )

  newBand.velocity = band.velocity + appliedForce * velocityMultiplier * config.recoilSpeed
  newBand.velocity *= (1.0 - config.damping)

  const restoreForce = -newBand.stretchX * config.stiffness * band.elasticity
  newBand.stretchX += restoreForce * 0.1

  newBand.wobble = Math.min(band.wobble + Math.abs(appliedForce) * 0.5, 25)
  newBand.wobbleSpeed = Math.min(band.wobbleSpeed + Math.abs(appliedForce) * 0.02, 0.15)

  return newBand
}

export function updateElasticBand(band: RubberBandState, dt: number): RubberBandState {
  const config = DEFAULT_ELASTIC_CONFIG
  const newBand = { ...band }

  const restoreForce = -newBand.stretchX * config.stiffness * band.elasticity
  const dampingForce = -newBand.velocity * config.damping

  newBand.velocity += (restoreForce + dampingForce) * dt
  newBand.stretchX += newBand.velocity * dt

  newBand.stretchX *= (1.0 - config.damping * 0.1 * dt)

  if (Math.abs(newBand.stretchX) < 0.01 && Math.abs(newBand.velocity) < 0.01) {
    newBand.stretchX = 0
    newBand.velocity = 0
  }

  newBand.wobble *= (1.0 - band.wobbleDecay * dt)
  if (newBand.wobble < 0.1) newBand.wobble = 0

  return newBand
}

export function judgeRhythm(
  actionTime: number,
  beatTime: number,
  config: RhythmConfig
): RhythmGrade {
  const diff = actionTime - beatTime
  const absDiff = Math.abs(diff)

  if (absDiff <= config.windowPerfect) return 'perfect'
  if (absDiff <= config.windowGood) return 'good'
  if (diff < 0 && absDiff <= config.windowEarly) return 'early'
  if (diff > 0 && absDiff <= config.windowLate) return 'late'
  return 'miss'
}

export function getBeatPosition(time: number, bpm: number): number {
  const beatInterval = 60000 / bpm
  const phase = (time % beatInterval) / beatInterval
  return phase
}

export function getNextBeatTime(time: number, bpm: number): number {
  const beatInterval = 60000 / bpm
  const currentBeat = Math.floor(time / beatInterval)
  return (currentBeat + 1) * beatInterval
}

export function getClosestBeatTime(time: number, bpm: number): number {
  const beatInterval = 60000 / bpm
  const currentBeat = Math.floor(time / beatInterval)
  const prevBeat = currentBeat * beatInterval
  const nextBeat = (currentBeat + 1) * beatInterval
  if (Math.abs(time - prevBeat) <= Math.abs(time - nextBeat)) {
    return prevBeat
  }
  return nextBeat
}

export function getHeightObstacle(rubberBandY: number): HeightObstacle {
  const heightFromGround = GROUND_Y - rubberBandY

  for (const level of HEIGHT_LEVELS) {
    if (heightFromGround >= level.minHeight && heightFromGround < level.maxHeight) {
      return level
    }
  }

  if (heightFromGround >= HEIGHT_LEVELS[HEIGHT_LEVELS.length - 1].maxHeight) {
    return HEIGHT_LEVELS[HEIGHT_LEVELS.length - 1]
  }

  return HEIGHT_LEVELS[0]
}

export function checkJumpHeight(jumpHeight: number, obstacle: HeightObstacle): boolean {
  return jumpHeight >= obstacle.requiredJumpHeight
}

export function getJumpHeightForBandY(rubberBandY: number): number {
  const obstacle = getHeightObstacle(rubberBandY)
  return obstacle.requiredJumpHeight
}

export function drawCollisionDebug(
  ctx: CanvasRenderingContext2D,
  player: CharacterRenderState,
  band: RubberBandState,
  time: number,
  action: ActionType
) {
  const feet = getPlayerFeetPositions(player)
  const useRightFoot = ['stepping', 'hooking', 'flicking', 'wrapping'].includes(player.state)
  const footX = useRightFoot ? feet.rightFootX : feet.leftFootX
  const footY = useRightFoot ? feet.rightFootY : feet.leftFootY

  ctx.save()

  ctx.strokeStyle = 'rgba(255,0,0,0.3)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(footX, footY)
  const bandY = band.y
  ctx.lineTo(footX, bandY)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = '#00FF00'
  ctx.beginPath()
  ctx.arc(feet.leftFootX, feet.leftFootY, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#FF0000'
  ctx.beginPath()
  ctx.arc(feet.rightFootX, feet.rightFootY, 5, 0, Math.PI * 2)
  ctx.fill()

  const tolerance = getActionTolerance(action)
  ctx.strokeStyle = 'rgba(255,215,0,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(footX, bandY, tolerance, 0, Math.PI * 2)
  ctx.stroke()

  if (band.stretchX !== 0) {
    ctx.strokeStyle = 'rgba(0,191,255,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(band.leftX, bandY + band.stretchX * Math.sin(0.5 * Math.PI))
    ctx.quadraticCurveTo(
      (band.leftX + band.rightX) / 2,
      bandY + band.stretchX,
      band.rightX,
      bandY + band.stretchX * Math.sin(0.5 * Math.PI)
    )
    ctx.stroke()
  }

  if (Math.abs(band.velocity) > 0.1) {
    ctx.fillStyle = 'rgba(255,165,0,0.7)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`v:${band.velocity.toFixed(1)}`, (band.leftX + band.rightX) / 2, bandY - 15)
  }

  ctx.restore()
}
