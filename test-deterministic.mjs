function hashCode(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function buildPrediction(excel) {
  const totalDemand = excel.rows.reduce((s, r) => s + (Number(r['箱量']) || 0), 0)
  const slotCount = 12
  const avgPerSlot = Math.round(totalDemand / slotCount)

  const dataSeed = hashCode(excel.rows.map(r => JSON.stringify(r)).join('|'))

  const etaCol = excel.matchedFields.includes('预计到港时间')
  const slotDist = new Array(slotCount).fill(0)

  if (etaCol) {
    const sorted = [...excel.rows].sort((a, b) => String(a['预计到港时间']).localeCompare(String(b['预计到港时间'])))
    const perSlot = Math.ceil(sorted.length / slotCount)
    sorted.forEach((r, i) => {
      const idx = Math.min(Math.floor(i / perSlot), slotCount - 1)
      slotDist[idx] += Number(r['箱量']) || 0
    })
  }

  const hasDist = slotDist.some(v => v > 0)
  const demand = new Array(slotCount).fill(0).map((_, i) => {
    if (hasDist) {
      return Math.max(slotDist[i], Math.round(avgPerSlot * 0.6))
    }
    const jitter = ((dataSeed + i * 137) % 31 - 15) / 100
    return Math.round(avgPerSlot * (1 + jitter))
  })
  const available = demand.map((d, i) => {
    const jitter = ((dataSeed + i * 89) % 21 - 10) / 100
    return Math.round(d * (0.82 + jitter * 0.08))
  })

  return { demand, available, dataSeed }
}

const excel1 = {
  matchedFields: ['起运港', '目的港', '箱量', '预计到港时间'],
  rows: [
    { 起运港: '上海港', 目的港: '重庆港', 箱量: 120, '预计到港时间': '2026-06-15 08:00' },
    { 起运港: '宁波港', 目的港: '长沙港', 箱量: 80, '预计到港时间': '2026-06-15 12:00' },
    { 起运港: '青岛港', 目的港: '西安港', 箱量: 150, '预计到港时间': '2026-06-16 10:00' },
  ]
}

const excel2 = JSON.parse(JSON.stringify(excel1))

const r1 = buildPrediction(excel1)
const r2 = buildPrediction(excel2)

console.log('第一次运行:', JSON.stringify(r1.demand))
console.log('第二次运行:', JSON.stringify(r2.demand))
console.log('结果一致:', JSON.stringify(r1.demand) === JSON.stringify(r2.demand))
console.log('dataSeed:', r1.dataSeed, r2.dataSeed)
console.log('')
console.log('available 第一次:', JSON.stringify(r1.available))
console.log('available 第二次:', JSON.stringify(r2.available))
console.log('available 一致:', JSON.stringify(r1.available) === JSON.stringify(r2.available))
