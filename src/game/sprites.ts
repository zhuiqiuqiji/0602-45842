import type { CharacterRenderState, RubberBandState, CloudState, Particle, ActionFeedback, ActionType } from '@/types/game'
import { ACTION_DEFS } from './actions'

const CANVAS_W = 960
const CANVAS_H = 540
const GROUND_Y = 440

export function drawBackground(ctx: CanvasRenderingContext2D, time: number, clouds: CloudState[]) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  skyGrad.addColorStop(0, '#87CEEB')
  skyGrad.addColorStop(0.6, '#B8E4F9')
  skyGrad.addColorStop(1, '#E8F5FD')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y)

  for (const cloud of clouds) {
    drawCloud(ctx, cloud)
  }

  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H)
  groundGrad.addColorStop(0, '#7CB342')
  groundGrad.addColorStop(0.3, '#689F38')
  groundGrad.addColorStop(1, '#558B2F')
  ctx.fillStyle = groundGrad
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y)

  ctx.strokeStyle = '#8BC34A'
  ctx.lineWidth = 2
  for (let x = 0; x < CANVAS_W; x += 12) {
    const h = 4 + Math.sin(x * 0.05 + time * 0.002) * 3
    ctx.beginPath()
    ctx.moveTo(x, GROUND_Y)
    ctx.lineTo(x + 3, GROUND_Y - h)
    ctx.stroke()
  }

  ctx.fillStyle = '#FFF8E7'
  ctx.fillRect(0, CANVAS_H - 15, CANVAS_W, 15)
  ctx.fillStyle = '#E8DCC8'
  ctx.fillRect(0, CANVAS_H - 15, CANVAS_W, 2)
}

function drawCloud(ctx: CanvasRenderingContext2D, cloud: CloudState) {
  ctx.save()
  ctx.globalAlpha = cloud.opacity
  ctx.fillStyle = '#FFFFFF'
  const cx = cloud.x
  const cy = cloud.y
  const w = cloud.width
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.5, w * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx - w * 0.25, cy + w * 0.05, w * 0.3, w * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx + w * 0.25, cy + w * 0.03, w * 0.35, w * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawRubberBand(ctx: CanvasRenderingContext2D, band: RubberBandState, time: number) {
  const segments = 60
  const wobbleAmt = band.wobble * Math.sin(time * band.wobbleSpeed)

  ctx.save()
  ctx.strokeStyle = '#FF69B4'
  ctx.lineWidth = 5
  ctx.shadowColor = '#FF69B4'
  ctx.shadowBlur = 8
  ctx.beginPath()
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = band.leftX + (band.rightX - band.leftX) * t
    const baseY = band.y
    const sag = Math.sin(t * Math.PI) * 15
    const wave = wobbleAmt * Math.sin(t * Math.PI * 4 + time * 0.01)
    const y = baseY + sag + wave
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  ctx.strokeStyle = '#FFB6C1'
  ctx.lineWidth = 2
  ctx.shadowBlur = 0
  ctx.beginPath()
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = band.leftX + (band.rightX - band.leftX) * t
    const sag = Math.sin(t * Math.PI) * 15
    const wave = wobbleAmt * Math.sin(t * Math.PI * 4 + time * 0.01)
    const y = band.y + sag + wave - 2
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
}

export function drawAssistant(ctx: CanvasRenderingContext2D, char: CharacterRenderState, armTargetAngle: number, bandY: number) {
  const x = char.x
  const baseY = GROUND_Y
  const headR = 18
  const bodyH = 55
  const bodyW = 30
  const legH = 45

  ctx.save()
  ctx.translate(x, baseY)

  ctx.strokeStyle = '#5D4037'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  const legSpread = 8
  ctx.beginPath()
  ctx.moveTo(-legSpread, 0)
  ctx.lineTo(-legSpread - 3, -legH)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(legSpread, 0)
  ctx.lineTo(legSpread + 3, -legH)
  ctx.stroke()

  const bodyTop = -legH - bodyH
  ctx.fillStyle = '#42A5F5'
  ctx.beginPath()
  ctx.roundRect(-bodyW / 2, bodyTop, bodyW, bodyH, 6)
  ctx.fill()
  ctx.strokeStyle = '#1E88E5'
  ctx.lineWidth = 1.5
  ctx.stroke()

  const headY = bodyTop - headR - 2
  ctx.fillStyle = '#FFCC80'
  ctx.beginPath()
  ctx.arc(0, headY, headR, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#E8A860'
  ctx.lineWidth = 1.5
  ctx.stroke()

  const eyeDir = char.facingRight ? 1 : -1
  ctx.fillStyle = '#333'
  ctx.beginPath()
  ctx.arc(-5 * eyeDir, headY - 3, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(5 * eyeDir, headY - 3, 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#E57373'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, headY + 5, 6, 0.1 * Math.PI, 0.9 * Math.PI)
  ctx.stroke()

  const shoulderY = bodyTop + 8
  const bandLocalY = bandY - baseY
  const dirX = char.facingRight ? 1 : -1
  const armTargetX = dirX * 30
  const armTargetYLocal = bandLocalY

  ctx.strokeStyle = '#FFCC80'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(dirX * bodyW / 2, shoulderY)
  ctx.lineTo(armTargetX, armTargetYLocal)
  ctx.stroke()

  ctx.fillStyle = '#FFCC80'
  ctx.beginPath()
  ctx.arc(armTargetX, armTargetYLocal, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export function drawPlayer(ctx: CanvasRenderingContext2D, char: CharacterRenderState, time: number) {
  const x = char.x
  const baseY = GROUND_Y - char.jumpHeight
  const headR = 16
  const bodyH = 45
  const bodyW = 26
  const legH = 38

  ctx.save()
  ctx.translate(x, baseY)

  const breathe = Math.sin(time * 0.003) * 1.5

  ctx.strokeStyle = '#5D4037'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'

  let leftLegAngle = 0
  let rightLegAngle = 0
  let leftArmAngle = 0
  let rightArmAngle = 0
  let bodyTilt = 0

  switch (char.state) {
    case 'idle':
      leftLegAngle = Math.sin(time * 0.002) * 3
      rightLegAngle = -leftLegAngle
      break
    case 'jumping':
      leftLegAngle = -20
      rightLegAngle = 20
      leftArmAngle = -40
      rightArmAngle = 40
      break
    case 'stepping':
      rightLegAngle = 45 + char.animProgress * 20
      leftArmAngle = -15
      rightArmAngle = 15
      bodyTilt = -5
      break
    case 'hooking':
      rightLegAngle = -60 - char.animProgress * 30
      leftArmAngle = -20
      rightArmAngle = 20
      bodyTilt = 3
      break
    case 'flicking':
      rightLegAngle = -30 + char.animProgress * 80
      leftArmAngle = 10
      rightArmAngle = -10
      bodyTilt = -8
      break
    case 'wrapping':
      rightLegAngle = Math.sin(char.animProgress * Math.PI * 2) * 40
      leftArmAngle = -15
      rightArmAngle = 15
      bodyTilt = Math.sin(char.animProgress * Math.PI) * 8
      break
  }

  ctx.save()
  ctx.rotate((bodyTilt * Math.PI) / 180)

  const legTopY = -legH
  const leftLegRad = (leftLegAngle * Math.PI) / 180
  const rightLegRad = (rightLegAngle * Math.PI) / 180

  ctx.beginPath()
  ctx.moveTo(-6, 0)
  ctx.lineTo(-6 + Math.sin(leftLegRad) * legH, -Math.cos(leftLegRad) * legH)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(6, 0)
  ctx.lineTo(6 + Math.sin(rightLegRad) * legH, -Math.cos(rightLegRad) * legH)
  ctx.stroke()

  const bodyTop = legTopY - bodyH + breathe
  ctx.fillStyle = '#FF6B35'
  ctx.beginPath()
  ctx.roundRect(-bodyW / 2, bodyTop, bodyW, bodyH, 5)
  ctx.fill()
  ctx.strokeStyle = '#E65100'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(-bodyW / 2 + 3, bodyTop + 12, bodyW - 6, 14, 3)
  ctx.fill()
  ctx.strokeStyle = '#E0E0E0'
  ctx.lineWidth = 0.5
  ctx.stroke()

  const shoulderY = bodyTop + 10
  ctx.strokeStyle = '#FFCC80'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  const armLen = 30
  const leftArmRad = (leftArmAngle * Math.PI) / 180
  const rightArmRad = (rightArmAngle * Math.PI) / 180
  ctx.beginPath()
  ctx.moveTo(-bodyW / 2, shoulderY)
  ctx.lineTo(-bodyW / 2 - Math.cos(leftArmRad) * armLen, shoulderY + Math.sin(leftArmRad) * armLen)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(bodyW / 2, shoulderY)
  ctx.lineTo(bodyW / 2 + Math.cos(rightArmRad) * armLen, shoulderY + Math.sin(rightArmRad) * armLen)
  ctx.stroke()

  const headY = bodyTop - headR - 2 + breathe * 0.5
  ctx.fillStyle = '#FFCC80'
  ctx.beginPath()
  ctx.arc(0, headY, headR, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#E8A860'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#333'
  ctx.beginPath()
  ctx.arc(-5, headY - 3, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(5, headY - 3, 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#FFF'
  ctx.beginPath()
  ctx.arc(-5, headY - 4, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(5, headY - 4, 1, 0, Math.PI * 2)
  ctx.fill()

  if (char.state === 'stepping' || char.state === 'hooking' || char.state === 'flicking' || char.state === 'wrapping') {
    ctx.strokeStyle = '#E57373'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, headY + 5, 5, 0.1 * Math.PI, 0.9 * Math.PI, false)
    ctx.stroke()
  } else {
    ctx.strokeStyle = '#E57373'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, headY + 5, 6, 0.15 * Math.PI, 0.85 * Math.PI, false)
    ctx.stroke()
  }

  ctx.fillStyle = '#FF9800'
  ctx.beginPath()
  ctx.arc(0, headY - headR + 5, headR + 2, -Math.PI, 0)
  ctx.lineTo(headR + 2, headY - headR + 5)
  ctx.arc(0, headY - headR + 5, headR + 2, 0, Math.PI, true)
  ctx.fill()

  ctx.fillStyle = '#F57C00'
  ctx.beginPath()
  ctx.moveTo(-headR - 2, headY - headR + 5)
  ctx.lineTo(0, headY - headR - 5)
  ctx.lineTo(headR + 2, headY - headR + 5)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
  ctx.restore()
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = p.life / p.maxLife
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function drawActionFeedback(ctx: CanvasRenderingContext2D, feedbacks: ActionFeedback[]) {
  for (const fb of feedbacks) {
    ctx.save()
    ctx.globalAlpha = fb.opacity
    ctx.fillStyle = fb.color
    ctx.font = `bold ${Math.round(28 * fb.scale)}px "Segoe UI", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = fb.color
    ctx.shadowBlur = 10
    ctx.fillText(fb.text, fb.x, fb.y)
    ctx.restore()
  }
}

export function drawHeightRuler(ctx: CanvasRenderingContext2D, currentY: number, targetY: number, heightLabel: string) {
  const rulerX = CANVAS_W - 45
  const topY = 60
  const bottomY = GROUND_Y

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(rulerX - 8, topY, 16, bottomY - topY)

  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(rulerX, topY)
  ctx.lineTo(rulerX, bottomY)
  ctx.stroke()
  ctx.setLineDash([])

  const fillHeight = bottomY - currentY
  ctx.fillStyle = 'rgba(255,107,53,0.5)'
  ctx.fillRect(rulerX - 6, currentY, 12, bottomY - currentY)

  ctx.fillStyle = '#FF6B35'
  ctx.beginPath()
  ctx.moveTo(rulerX - 10, currentY)
  ctx.lineTo(rulerX - 18, currentY - 5)
  ctx.lineTo(rulerX - 18, currentY + 5)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(heightLabel, rulerX - 22, currentY + 4)
  ctx.restore()
}

export function drawActionPreviewOnCanvas(
  ctx: CanvasRenderingContext2D,
  currentAction: ActionType | null,
  _time: number
) {
  if (!currentAction) return
  const def = ACTION_DEFS[currentAction]
  const cx = CANVAS_W / 2
  const cy = 80

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.roundRect(cx - 60, cy - 25, 120, 50, 12)
  ctx.fill()

  ctx.fillStyle = def.color
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(def.icon + ' ' + def.name, cx, cy)
  ctx.restore()
}
