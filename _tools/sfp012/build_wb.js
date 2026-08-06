// SFP-012 데이터 변환: 고등단어장 어원편 엑셀 → WB["고등단어장 어원편"] 주입
//
//   node build_wb.js "<엑셀경로>" [출력파일]
//   엑셀 경로는 필수. 원본 파일명에 출판사 상품명이 들어 있어 기본값을 코드에 박지 않는다.
//   (원본은 .gitignore로 커밋 차단 — 로컬에만 둔다)
//   출력파일 기본값: SF_Word_Test_20.html
//
// 원칙:
//  - 시트는 '어휘리스트_의미축소'만 사용 (일반 '어휘리스트'는 다의어 풀이가 길어 제외 — 검토 완료)
//  - 원본 행 순서 그대로 보존 (재정렬 금지). '유형'(표/파) 컬럼은 순서만 지키고 값은 안 씀
//  - 모든 값은 JSON.stringify로 이스케이프 (손으로 문자열 이어붙이지 말 것)
//  - 기존 WB["Voca 3000"]은 문자열 삽입만 하고 한 글자도 건드리지 않음 (md5로 확인)
//
// 이 스크립트는 20.html을 이미 만든 뒤 재생성/검증용으로 남겨둔 것이다.
// 실행하면 출력 파일을 덮어쓰므로, 20.html에 손으로 넣은 UI 수정이 있으면 날아간다. 주의.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..', '..');
const SHEET = '어휘리스트_의미축소';
const BOOK = '고등단어장 어원편';
const SRC = path.join(ROOT, 'SF_Word_Test_19.html');
const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error('사용법: node build_wb.js "<엑셀경로>" [출력파일]');
  console.error('  엑셀 원본은 저장소에 없다(.gitignore). 로컬 경로를 직접 넘길 것.');
  process.exit(1);
}
const OUT = process.argv[3] || path.join(ROOT, 'SF_Word_Test_20.html');

// ── 1. 엑셀 → 단원별 그룹 (원본 순서 유지) ──
const wbx = XLSX.readFile(xlsxPath);
if (!wbx.Sheets[SHEET]) throw new Error(`시트 '${SHEET}' 없음. 있는 시트: ${wbx.SheetNames.join(', ')}`);
const rows = XLSX.utils.sheet_to_json(wbx.Sheets[SHEET], { header: 1, defval: '' });

const g = {}, order = [], bad = [];
for (let i = 1; i < rows.length; i++) {            // 1행은 헤더(단원/유형/영단어/한글 뜻)
  const u = String(rows[i][0]).trim();
  const en = String(rows[i][2]).trim();
  const ko = String(rows[i][3]).trim();
  if (!u || !en || !ko) { bad.push(i + 1); continue; }
  if (!g[u]) { g[u] = []; order.push(u); }
  g[u].push([en, ko]);
}
if (bad.length) console.warn('빈 칸이 있어 건너뛴 행:', bad.join(', '));
console.log(`단원 ${order.length}개 / 단어 ${order.reduce((s, u) => s + g[u].length, 0)}개`);

// ── 2. JS 객체 리터럴 생성 ──
const J = JSON.stringify;
const bookLit = '{' + order.map(u =>
  J(u) + ': [' + g[u].map(([en, ko]) => '[' + J(en) + ', ' + J(ko) + ']').join(', ') + ']'
).join(', ') + '}';

// ── 3. WB 한 줄에 형제 키로 삽입 ──
const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split('\n');
const idx = lines.findIndex(l => l.startsWith('const WB={'));
if (idx < 0) throw new Error('WB 라인을 못 찾음');
const wbLine = lines[idx];
if (!wbLine.endsWith('}};')) throw new Error('WB 라인 끝 형태가 예상과 다름: ' + wbLine.slice(-20));
const inner = wbLine.slice('const WB={'.length, -2);   // '"Voca 3000": {...}'
lines[idx] = 'const WB={' + inner + ', ' + J(BOOK) + ': ' + bookLit + '};';
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');

// ── 4. 검증: Voca 3000 무변경 + 신규 데이터 순서 보존 ──
const md5 = s => crypto.createHash('md5').update(s, 'utf8').digest('hex');
const outLine = fs.readFileSync(OUT, 'utf8').split('\n')[idx];
const WB19 = (new Function(wbLine + ' return WB;'))();
const WB20 = (new Function(outLine + ' return WB;'))();
const same = J(WB19['Voca 3000']) === J(WB20['Voca 3000']);
console.log('Voca 3000 md5      :', md5(J(WB19['Voca 3000'])), same ? '(무변경 OK)' : '(!! 변경됨 !!)');
console.log('WB 키              :', J(Object.keys(WB20)));
console.log('단원 순서 보존     :', J(Object.keys(WB20[BOOK])) === J(order));
console.log('단원별 배열 일치   :', order.every(u => J(WB20[BOOK][u]) === J(g[u])));
console.log('433행 외 변경 줄 수:', src.split('\n').filter((l, i) => i !== idx && l !== lines[i]).length);
if (!same) process.exit(1);
console.log(`\n→ ${path.basename(OUT)} 생성 완료. UI 수정(소스 카드/gbo 정렬 등)은 별도로 적용해야 한다.`);
