import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ports } from '@/mock/data'

interface ProvinceData {
  name: string
  avgTransitTime: number
  routeCount: number
}

interface ProvinceShape {
  name: string
  path: string
  labelX: number
  labelY: number
}

const provinceShapes: ProvinceShape[] = [
  { name: '辽宁', path: 'M480,70 L530,65 L560,90 L555,130 L530,150 L500,145 L475,125 L470,95 Z', labelX: 515, labelY: 110 },
  { name: '天津', path: 'M430,145 L465,140 L475,125 L500,145 L490,165 L460,170 L435,160 Z', labelX: 465, labelY: 155 },
  { name: '山东', path: 'M430,195 L475,180 L510,190 L530,215 L520,250 L490,260 L455,250 L430,230 Z', labelX: 478, labelY: 225 },
  { name: '上海', path: 'M490,295 L515,285 L530,300 L525,325 L505,335 L488,320 Z', labelX: 509, labelY: 310 },
  { name: '浙江', path: 'M460,310 L490,295 L488,320 L505,335 L490,360 L465,365 L450,340 Z', labelX: 473, labelY: 335 },
  { name: '福建', path: 'M435,360 L465,355 L490,360 L480,395 L455,405 L430,390 Z', labelX: 462, labelY: 383 },
  { name: '广东', path: 'M395,395 L435,390 L455,405 L445,435 L420,450 L390,440 L380,415 Z', labelX: 418, labelY: 422 },
  { name: '江苏', path: 'M460,270 L490,265 L500,295 L490,295 L460,310 L450,290 Z', labelX: 473, labelY: 288 },
  { name: '河北', path: 'M395,125 L435,130 L465,140 L430,145 L435,160 L420,175 L400,170 L385,150 Z', labelX: 415, labelY: 150 },
  { name: '河南', path: 'M380,200 L420,190 L435,210 L430,240 L410,250 L385,245 L370,225 Z', labelX: 403, labelY: 222 },
  { name: '湖北', path: 'M355,270 L395,260 L420,270 L430,295 L410,315 L380,310 L360,295 Z', labelX: 392, labelY: 288 },
  { name: '湖南', path: 'M350,320 L385,310 L410,315 L405,350 L385,370 L355,365 L340,345 Z', labelX: 374, labelY: 342 },
  { name: '江西', path: 'M415,325 L440,315 L455,340 L450,375 L430,390 L410,380 L405,350 Z', labelX: 432, labelY: 355 },
  { name: '安徽', path: 'M430,240 L460,235 L470,265 L460,270 L450,290 L440,285 L430,260 Z', labelX: 448, labelY: 262 },
  { name: '四川', path: 'M260,230 L310,220 L345,235 L355,270 L340,310 L305,320 L270,305 L255,270 Z', labelX: 303, labelY: 272 },
  { name: '重庆', path: 'M310,310 L340,305 L355,330 L345,355 L320,360 L305,345 L300,325 Z', labelX: 325, labelY: 335 },
  { name: '陕西', path: 'M320,170 L365,165 L385,180 L380,210 L360,225 L330,220 L310,200 Z', labelX: 348, labelY: 196 },
  { name: '广西', path: 'M320,390 L365,380 L390,395 L380,435 L355,450 L325,440 L310,415 Z', labelX: 350, labelY: 418 },
  { name: '云南', path: 'M220,340 L270,325 L305,345 L300,390 L275,420 L240,415 L215,385 Z', labelX: 260, labelY: 373 },
  { name: '贵州', path: 'M275,340 L310,335 L325,360 L320,390 L295,400 L270,385 L265,360 Z', labelX: 295, labelY: 368 },
  { name: '黑龙江', path: 'M490,15 L560,10 L600,35 L595,65 L560,75 L530,65 L480,70 L475,45 Z', labelX: 545, labelY: 45 },
  { name: '吉林', path: 'M510,75 L560,75 L565,110 L555,130 L530,130 L500,125 L505,95 Z', labelX: 535, labelY: 105 },
]

function getColor(avgTime: number): string {
  if (avgTime <= 3) return '#00C9A7'
  if (avgTime <= 5) return '#FFD93D'
  if (avgTime <= 7) return '#FF8C42'
  return '#FF4757'
}

export default function ChinaHeatMap({ data }: { data: ProvinceData[] }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<string | null>(null)

  const dataMap = new Map(data.map((d) => [d.name, d]))

  const getPortId = (province: string) => {
    const port = ports.find((p) => p.province === province)
    return port?.id
  }

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 600 500" className="h-full w-full">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,201,167,0.04)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="600" height="500" fill="#0F1923" />
        <rect width="600" height="500" fill="url(#grid)" />

        {provinceShapes.map((shape) => {
          const provData = dataMap.get(shape.name)
          const color = provData ? getColor(provData.avgTransitTime) : '#1E3048'
          const isHovered = hovered === shape.name

          return (
            <g
              key={shape.name}
              onMouseEnter={() => setHovered(shape.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                const portId = getPortId(shape.name)
                if (portId) navigate(`/port/${portId}`)
              }}
              className="cursor-pointer"
            >
              <path
                d={shape.path}
                fill={color}
                fillOpacity={isHovered ? 0.9 : 0.55}
                stroke={isHovered ? '#00C9A7' : '#1E3048'}
                strokeWidth={isHovered ? 1.5 : 0.8}
                className="transition-all duration-200"
              />
              <text
                x={shape.labelX}
                y={shape.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? '#fff' : 'rgba(226,232,240,0.7)'}
                fontSize="10"
                className="pointer-events-none select-none"
              >
                {shape.name}
              </text>
            </g>
          )
        })}
      </svg>

      {hovered && dataMap.has(hovered) && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-lg border border-surface-border bg-surface-card/95 px-4 py-3 shadow-xl backdrop-blur-sm">
          <div className="text-sm font-semibold text-slate-200">{hovered}</div>
          <div className="mt-1 text-xs text-slate-400">
            平均时效: <span className="text-slate-200">{dataMap.get(hovered)!.avgTransitTime}天</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            路线数量: <span className="text-slate-200">{dataMap.get(hovered)!.routeCount}条</span>
          </div>
        </div>
      )}
    </div>
  )
}
