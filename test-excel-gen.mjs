import XLSX from 'xlsx'
import { writeFileSync } from 'fs'

const data = [
  { 起运港: '上海港', 目的港: '重庆港', 中转港: '武汉港', '预计到港时间': '2026-06-15 08:00', 箱量: 120, 箱型: '40GP' },
  { 起运港: '宁波港', 目的港: '长沙港', 中转港: '', '预计到港时间': '2026-06-15 12:00', 箱量: 80, 箱型: '20GP' },
  { 起运港: '青岛港', 目的港: '西安港', 中转港: '济南港', '预计到港时间': '2026-06-16 10:00', 箱量: 150, 箱型: '40HC' },
]

const ws = XLSX.utils.json_to_sheet(data)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, '船期表')
XLSX.writeFile(wb, 'test-shipping.xlsx')
console.log('生成成功: test-shipping.xlsx')
