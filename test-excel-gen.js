import XLSX from 'xlsx';

const data = [
  { '起运港': '上海港', '目的港': '重庆港', '中转港': '武汉阳逻港', '预计到港时间': '2026-06-14', '箱量': 200, '箱型': '40GP' },
  { '起运港': '上海港', '目的港': '武汉港', '中转港': '', '预计到港时间': '2026-06-13', '箱量': 150, '箱型': '20GP' },
  { '起运港': '宁波港', '目的港': '长沙港', '中转港': '上海港', '预计到港时间': '2026-06-15', '箱量': 120, '箱型': '40HC' },
  { '起运港': '广州港', '目的港': '昆明港', '中转港': '深圳盐田港', '预计到港时间': '2026-06-14', '箱量': 80, '箱型': '20RF' },
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, 'test-schedule.xlsx');
console.log('Excel file created: test-schedule.xlsx');
