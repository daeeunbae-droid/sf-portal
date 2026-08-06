// jsdom 하네스 (SFP-004-P 관례): 파일을 로드하고 로그인→소스선택 클릭 시뮬레이션
const fs = require('fs');
const { JSDOM } = require('jsdom');

function load(file) {
  const html = fs.readFileSync(file, 'utf8')
    // 외부 firebase CDN 스크립트 제거 (오프라인)
    .replace(/<script src="https:\/\/www\.gstatic\.com[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/' });
  const w = dom.window;
  w.alert = (m) => { (w.__alerts = w.__alerts || []).push(m); };
  w.confirm = () => true;
  return { dom, w, d: w.document };
}

function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; }
function vis(el) {
  if (!el) return false;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (n.style && n.style.display === 'none') return false;
    if (n.classList && n.classList.contains('hd')) return false;
  }
  return true;
}
function login(w, name) {
  const d = w.document;
  d.getElementById('ni').value = name;
  w.dl();
}
module.exports = { load, txt, vis, login };
