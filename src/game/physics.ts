import type { ActionType, CharacterRenderState, RubberBandState } from '@/types/game'

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
  return band.y + sag + wobble
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

  return {
    distance,
    footX,
    footY,
    bandX,
    bandY,
    collided,
    collisionType,
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

  ctx.restore()
}
