// SFP-012 검증: 고등단어장 어원편(신규 소스) 동작 + 기존 경로(Voca 3000 / 모의고사) 회귀
// 실행: _tools/sfp012 에서  npm install  후  node verify.js
// 19를 "정답지"로 놓고 20과 대조하는 구조라 두 파일이 모두 저장소 루트에 있어야 한다.
const path = require('path');
const { load, txt, vis, login } = require('./harness');
const ROOT = path.resolve(__dirname, '..', '..');
const F19 = path.join(ROOT, 'SF_Word_Test_19.html');
const F20 = path.join(ROOT, 'SF_Word_Test_20.html');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // ─────────────────────────────────────────────────────────
  console.log('\n[A] gbo() 단원 순서 — 19 vs 20 대조');
  const a19 = load(F19), a20 = load(F20);
  await sleep(200);
  const g19 = a19.w.gbo(), g20 = a20.w.gbo();
  const by = (arr, n) => arr.find(b => b.n === n);
  ok('Voca 3000 페이지 목록 무변경', JSON.stringify(by(g19, 'Voca 3000').ps) === JSON.stringify(by(g20, 'Voca 3000').ps));
  ok('RL(독해지문) 목록 무변경',
    JSON.stringify(g19.filter(b => b.t === 'read')) === JSON.stringify(g20.filter(b => b.t === 'read')));
  const ny = by(g20, '고등단어장 어원편');
  ok('고등단어장 소스 존재', !!ny);
  ok('단원 67개', ny.ps.length === 67, ny && ny.ps.length);
  ok('DAY 01~60 이 앞 60칸에 순서대로', ny.ps.slice(0, 60).every((p, i) => p === 'DAY ' + String(i + 1).padStart(2, '0')), ny.ps.slice(0, 8));
  ok('부록 7개가 뒤에 붙음', ny.ps.slice(60).length === 7 && !ny.ps.slice(60).some(p => /^DAY/.test(p)), ny.ps.slice(60));
  ok('부록이 DAY 사이에 끼지 않음', ny.ps.slice(0, 60).every(p => /^DAY/.test(p)));

  // 단어 데이터 무결성
  const WB20 = a20.w.eval("WB"), WB19 = a19.w.eval("WB");
  ok('WB["Voca 3000"] 완전 동일', JSON.stringify(WB19['Voca 3000']) === JSON.stringify(WB20['Voca 3000']));
  ok('WB 키 2개', JSON.stringify(Object.keys(WB20)) === JSON.stringify(['Voca 3000', '고등단어장 어원편']));
  const total = ny.ps.reduce((s, p) => s + a20.w.gw('고등단어장 어원편', p).length, 0);
  ok('총 단어 3001', total === 3001, total);
  ok('gw("고등단어장 어원편","DAY 01")[0] = progress',
    a20.w.gw('고등단어장 어원편', 'DAY 01')[0][0] === 'progress', a20.w.gw('고등단어장 어원편', 'DAY 01')[0]);
  ok('RL/VOCA_SENTENCE_DATA 무변경',
    JSON.stringify(a19.w.eval("RL")) === JSON.stringify(a20.w.eval("RL")) &&
    JSON.stringify(a19.w.eval("VOCA_SENTENCE_DATA")) === JSON.stringify(a20.w.eval("VOCA_SENTENCE_DATA")));

  // ─────────────────────────────────────────────────────────
  console.log('\n[B] 로그인 → 소스 선택 화면 (카드 3개)');
  const { w, d } = load(F20);
  await sleep(200);
  login(w, '테스트학생');
  const names = [...d.querySelectorAll('#srcSelect .vs-src-name')].map(txt);
  ok('소스 선택 화면 노출', vis(d.getElementById('srcSelect')));
  ok('카드 3개 = Voca 3000 / 고등단어장 어원편 / 모의고사 단어',
    JSON.stringify(names) === JSON.stringify(['Voca 3000', '고등단어장 어원편', '모의고사 단어']), names);

  // ─────────────────────────────────────────────────────────
  console.log('\n[C] 고등단어장 어원편 → 3모드 화면');
  await w.chooseNyVoca();
  await sleep(50);
  ok('3모드 화면 노출', vis(d.getElementById('home')));
  ok('소스바에 고등단어장 어원편', /고등단어장 어원편/.test(txt(d.getElementById('srcBar'))), txt(d.getElementById('srcBar')));
  const rc = d.querySelector('.vs-mode-card[data-mode="review"]');
  ok('오답 다시 풀기 카드 비활성', rc.classList.contains('vs-disabled'));
  ok('오답 카드 배지 = 준비 중', /준비 중/.test(txt(d.getElementById('reviewBadge'))), txt(d.getElementById('reviewBadge')));
  ok('익히기/확인하기는 활성',
    !d.querySelector('.vs-mode-card[data-mode="learn"]').classList.contains('vs-disabled') &&
    !d.querySelector('.vs-mode-card[data-mode="test"]').classList.contains('vs-disabled'));
  rc.onclick();
  ok('비활성 카드 클릭해도 진입 안 됨', vis(d.getElementById('home')) && !vis(d.getElementById('app')));

  // ─────────────────────────────────────────────────────────
  console.log('\n[D] 익히기 진입 → DAY 단원 목록');
  d.querySelector('.vs-mode-card[data-mode="learn"]').onclick();
  await sleep(50);
  ok('#app 노출', vis(d.getElementById('app')));
  ok('S.b2 = 고등단어장 어원편', w.eval("S").b2 === '고등단어장 어원편', w.eval("S").b2);
  ok('selSub 라벨', txt(d.getElementById('selSub')) === '고등단어장 어원편 · 익히기', txt(d.getElementById('selSub')));
  ok('src2Head 라벨', /고등단어장 어원편/.test(txt(d.getElementById('src2Head'))), txt(d.getElementById('src2Head')));
  ok('소스1 블록 숨김', !vis(d.getElementById('src1Box')));
  ok('모드탭 숨김', !vis(d.getElementById('modeTab')));
  ok('s2b 옵션 3개(빈값+책2권)',
    [...d.querySelectorAll('#s2b option')].map(o => o.value).join('|') === '|Voca 3000|고등단어장 어원편',
    [...d.querySelectorAll('#s2b option')].map(o => o.value));
  const btns = [...d.querySelectorAll('#s2ps .pgBtn')].map(txt);
  ok('단원 버튼 노출됨', vis(d.getElementById('s2ps')));
  ok('단원 버튼 67개', btns.length === 67, btns.length);
  ok('DAY 01 … DAY 60 … 부록 순서',
    btns[0] === 'DAY 01' && btns[59] === 'DAY 60' && btns[60] === '접사에 따라 뜻이 달라지는 혼동 어휘 1' && btns[66] === '철자가 비슷한 혼동 어휘 3',
    [btns[0], btns[59], btns[60], btns[66]]);

  // DAY 01 + 부록 하나 선택 → 학습 시작
  const pick = (label) => { const el = [...d.querySelectorAll('#s2ps .pgBtn')].find(b => txt(b) === label); el.onclick(); };
  pick('DAY 01'); pick('-ly, -s가 붙어 뜻이 달라지는 혼동 어휘');
  ok('S.ps2 선택 반영', JSON.stringify(w.eval("S").ps2) === JSON.stringify(['DAY 01', '-ly, -s가 붙어 뜻이 달라지는 혼동 어휘']), w.eval("S").ps2);
  ok('시작 버튼 활성', d.getElementById('stBtn').disabled === false);
  ok('선택 요약 단어수 = 44+24', /68개/.test(txt(d.getElementById('ss'))), txt(d.getElementById('ss')));
  w.doStudy();
  await sleep(50);
  ok('학습 화면 진입(S.sc=study)', w.eval("S").sc === 'study', w.eval("S").sc);
  ok('학습 문항 68개', w.eval("S").sqs.length === 68, w.eval("S").sqs.length);
  ok('학습 문항이 고등단어장 단어에서 나옴',
    w.eval("S").sqs.every(q => w.gwM('고등단어장 어원편', ['DAY 01', '-ly, -s가 붙어 뜻이 달라지는 혼동 어휘']).some(x => x[0] === q.en)));

  // ─────────────────────────────────────────────────────────
  console.log('\n[E] 확인하기 진입 + 오답이 Voca3000 오답풀을 오염시키지 않음');
  const B = load(F20); await sleep(200);
  login(B.w, '테스트학생2');
  await B.w.chooseNyVoca(); await sleep(30);
  B.d.querySelector('.vs-mode-card[data-mode="test"]').onclick(); await sleep(30);
  ok('S.mode=test', B.w.eval("S").mode === 'test', B.w.eval("S").mode);
  ok('selSub 확인하기', txt(B.d.getElementById('selSub')) === '고등단어장 어원편 · 확인하기', txt(B.d.getElementById('selSub')));
  [...B.d.querySelectorAll('#s2ps .pgBtn')].find(b => txt(b) === 'DAY 03').onclick();
  B.d.getElementById('strictCk').checked = false;
  B.w.doStart(); await sleep(80);
  ok('테스트 화면 진입', B.w.eval("S").sc === 'test' || B.w.eval("S").sc === 'resume', B.w.eval("S").sc);
  ok('문항 생성됨(31개의 60%)', B.w.eval("S").qs.length > 0, B.w.eval("S").qs.length);
  // 일부러 오답 제출
  const before = await B.w.v3LoadWrong();
  B.d.getElementById('ai').value = 'zzz-오답';
  B.w.sa(); await sleep(30);
  const after = await B.w.v3LoadWrong();
  ok('고등단어장 오답이 voca3000 오답풀에 안 쌓임', after.length === before.length, { before: before.length, after: after.length });

  // ─────────────────────────────────────────────────────────
  console.log('\n[F] 회귀 — Voca 3000 경로');
  const C = load(F20); await sleep(200);
  login(C.w, '회귀학생');
  await C.w.chooseVoca3000(); await sleep(30);
  ok('소스바 Voca 3000', /Voca 3000/.test(txt(C.d.getElementById('srcBar'))));
  ok('오답 카드 활성 유지(19와 동일)', !C.d.querySelector('.vs-mode-card[data-mode="review"]').classList.contains('vs-disabled'));
  C.d.querySelector('.vs-mode-card[data-mode="test"]').onclick(); await sleep(30);
  ok('S.b2=Voca 3000', C.w.eval("S").b2 === 'Voca 3000', C.w.eval("S").b2);
  ok('selSub Voca 3000 · 확인하기', txt(C.d.getElementById('selSub')) === 'Voca 3000 · 확인하기', txt(C.d.getElementById('selSub')));
  // 19와 동일하게 드롭다운으로 페이지 목록 펼치기
  C.d.getElementById('s2b').value = 'Voca 3000'; C.w.up2();
  const p = [...C.d.querySelectorAll('#s2ps .pgBtn')].map(txt);
  ok('p1~p148 그대로', p.length === 148 && p[0] === 'p1' && p[147] === 'p148', [p.length, p[0], p[147]]);
  [...C.d.querySelectorAll('#s2ps .pgBtn')].find(b => txt(b) === 'p1').onclick();
  C.d.getElementById('strictCk').checked = false;
  C.w.doStart(); await sleep(80);
  ok('Voca 3000 테스트 진입', C.w.eval("S").sc === 'test', C.w.eval("S").sc);
  const b4 = await C.w.v3LoadWrong();
  C.d.getElementById('ai').value = 'zzz-오답'; C.w.sa(); await sleep(40);
  const af = await C.w.v3LoadWrong();
  ok('Voca 3000 오답은 정상 누적', af.length === b4.length + 1, { before: b4.length, after: af.length });

  // 나가기 → 소스 선택 복귀 → 소스 변경
  C.w.backFromVoca(); await sleep(30);
  ok('나가기 → 3모드 화면 복귀', vis(C.d.getElementById('home')) && !vis(C.d.getElementById('app')));
  C.w.changeSource(); await sleep(30);
  ok('소스 변경 → 소스 선택 화면', vis(C.d.getElementById('srcSelect')));
  ok('카드 3개 유지', C.d.querySelectorAll('#srcSelect .vs-src-name').length === 3);
  await C.w.chooseNyVoca(); await sleep(30);
  ok('소스 전환(Voca3000→고등단어장) 정상', /고등단어장 어원편/.test(txt(C.d.getElementById('srcBar'))));
  ok('전환 후 오답카드 비활성', C.d.querySelector('.vs-mode-card[data-mode="review"]').classList.contains('vs-disabled'));
  await C.w.chooseVoca3000(); await sleep(30);
  ok('되돌아가면 오답카드 다시 활성', !C.d.querySelector('.vs-mode-card[data-mode="review"]').classList.contains('vs-disabled'));

  // ─────────────────────────────────────────────────────────
  console.log('\n[G] 회귀 — 모의고사 단어(문장형) 경로');
  const E = load(F20); await sleep(200);
  login(E.w, '회귀학생2');
  const sel = E.d.getElementById('examSel');
  ok('회차 드롭다운 채워짐', sel.options.length > 0, sel.options.length);
  sel.value = sel.options[0].value;
  await E.w.chooseExam(); await sleep(50);
  ok('모의고사 3모드 화면', vis(E.d.getElementById('home')));
  ok('소스바에 회차명', txt(E.d.getElementById('srcBar')).length > 5, txt(E.d.getElementById('srcBar')));
  E.d.querySelector('.vs-mode-card[data-mode="learn"]').onclick(); await sleep(60);
  ok('문장형 학습 화면 진입', vis(E.d.getElementById('run')), txt(E.d.getElementById('modePill')));
  ok('VOCA_SENTENCE_DATA 경로 유지', E.w.eval("DATA") && E.w.eval("DATA").words && E.w.eval("DATA").words.length > 0);

  console.log('\n────────────────────────');
  console.log(`PASS ${pass} / FAIL ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
