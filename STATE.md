# STATE — sf-portal 현재 상태

> **현재상태 캐시(current-state cache).** 진실이 아니라 실물의 파생물이다. 어긋나면 **이 파일이 틀린 것이다.**
> **덮어쓴다** — 이유는 결정로그, 사건은 작업대장. **4KB는 경보선**(넘으면 사실을 빼지 말고 구조를 다시 본다).
> **공개 저장소다** — 민감 항목은 제목만, 상세는 비공개 문서.

**갱신** 2026-10-20 (SFP-019 라이브 전환) · **기준선** 2026-08-26 실물 대조 = `검증됨` (단 Firebase는 미확인)

```state-check
index: index.html
voca_entry: SF_Word_Test_23.html
structure_entry: SF-Structure-Trainer.html
must_exist: SF_Word_Test_19.html, SF_Word_Test_20.html, SF_Word_Test_21.html, SF_Word_Test_22.html, SF_Word_Test_23.html, .nojekyll, _tools/sfp012/verify.js
wb_md5.Voca 3000: 919d8cdd01fd32a440c9a07f028f8278
stale_ignore: STATE.md, CLAUDE.md, README.md
```

**그 순간 계산되는 값(HEAD 해시·미push 건수)은 적지 않는다** — 적는 행위가 값을 틀리게 만든다.
`.gitignore`는 공개 범위를 정하는 안전 장치라 신선도 감시에 포함한다.

## 진실 표면 — "실물"은 단수가 아니다

| 표면 | 확인 방법 | 지금 |
|---|---|---|
| 코드 | `git log` · `state.py` | 검사됨 |
| 원격 | `python3 _tools/state/state.py --fetch` | **검사기 출력 참조** — 최초 동기화 2026-08-29 |
| 배포(Pages) | 라이브 URL 실제 접속 | 2026-10-20 확인 — `SF_Word_Test_23.html` 200 · 카드 5개 · 실기기 열림(대은) |
| Firebase | 실기기만. `verify.js`는 `memStore`로 떼고 돌림 | **미확인** |

「git이 사실」은 **코드에 한해서**다.

## 정본

| 무엇 | 파일 | 근거 |
|---|---|---|
| 포털 | `index.html` | — |
| Voca | `SF_Word_Test_23.html` | `TOOL_URL.voca` — 검사기가 대조 [#SFP-019-1] |
| Structure | `SF-Structure-Trainer.html` | `TOOL_URL.structure` — 검사기가 대조 |

`21` = 20 + 「초등 영단어 5-6학년」 소스(1~5강). `verify.js`는 여전히 19↔20 대조(21로 돌리면 책 수 관련 4건만 FAIL — 예상값).
`22` = 21 + 초등 영단어 6~10강·3강 보충(총 119단어) + 초등 영단어 「오답 다시 풀기」(이번 달 `results/{학생}` 기록 읽기 전용) [#SFP-018-1]
`23` = 22 + 「단추(기본)」 소스(DAY 01~05, 200단어) + 같은 방식의 오답 다시 풀기 — **라이브 전환 완료**(라이브·실기기 확인) [#SFP-019-1]
`22` = 직전 정본, **롤백 스위치**(`TOOL_URL.voca` 한 줄) — 지우지 않는다 [#SFP-012-6]. `20`·`21`도 지우지 않는다.
`15_2 / 16 / 17 / 19` = 무참조 구버전. **19는 지우지 않는다**(`verify.js`의 정답지). `18`은 결번.

## 불변식

- `WB["Voca 3000"]` md5 · `.nojekyll` [#SFP-013-4] — 검사기가 대조
- `RL` · `VOCA_SENTENCE_DATA` · `rAdmin` · Firebase `voca_sentence/*` · `voca3000/…/wrong/{YYYY-MM}` · `structure_trainer/results/*` — **미확인**(사람이 본다)
- `structure_trainer/results` **Phase III 레코드에는 `correct`·`pct`·`detail` 이 없다** — 관리자 화면이 `firstCorrect`·`firstPct` 로 폴백한다 [#SFP-016-1]

## 작업

**Active (≤1): 38번 Phase I/II 제작**

| 상태 | 항목 |
|---|---|
| Blocked | Voca 오답풀 책별 분리 — `v3Path()`에 `bookKey` 분기. **Firebase 스키마 = 승인 대기** [#SFP-012-4] |
| Ready | `verify.js` 정답지를 20↔21로 올리기 |
| Urgent | 없음 |

## 열린 미결

| # | 내용 | 누구 |
|---|---|---|
| A | 구버전 처리 — 권고 A-2(19 남기고 `15_2·16·17` 삭제) | 승인 |
| C | `_tools/anatomy/` 비공개 백업처 — gitignore는 백업이 아니다 | 대은 |
| D | 단어 데이터 공개 범위 | 대은 |
| E | `verify.js`를 실제 gate에 연결(pre-commit) — 지금은 실행하라는 문장뿐 | 대기 |
| H | 초등 영단어 소스 카드 문구(「초등 영단어 5-6학년」·「초등 단어책 · 강별 뜻 테스트」) — 학생 노출 문구 **승인 대기** [#SFP-017-2] | 승인 |
| I | `state.py`가 Windows 기본 콘솔(cp949)에서 `✓` 출력 중 `UnicodeEncodeError`로 죽는다 — 지금은 `PYTHONIOENCODING=utf-8`로 우회 | 대기 |
| J | 포털 관리자 인증 방식 점검 — 상세는 비공개 작업대장 SFP-017 | 대은 |
| M | 확인하기 출제 수 부족 — `buildTestQs`·`goTestFromStudy`가 뜻이 하나인 단어가 모자라면 남은 다의어로 채우지 않아 문제가 빠진다(단추 DAY 01+02: 72→약 43, 어원편 DAY 01: 40→약 21). 19부터 있던 엔진 버그. 고치면 문항 구성 변경 = **승인 필요**, 24로 | 승인 |
| N | STATE 구조 재검토 — 4KB 경보선 초과(약 5.6KB) | 대기 |
| F | 관리자 화면 Phase III 표시 — **실데이터·실기기 확인** [#SFP-016-1] (jsdom 목업만 통과) | 대은 |

## 확정된 방향 — 착수 전

- Structure 내신 파트 = **선별** · 노출 조치 = `noindex`+`robots.txt` · 거버넌스 = 인계파일 계보 종료, 확산은 3~5세션 뒤
  — 필터 조건·문항 수·해제 트리거 등 **세부 전부 결정로그 `#SFP-014-9~11`**

## 라인 고유 지표

Phase I/II `DATA.passages` = **17** · Phase III = **18**(+38번, 41-42는 41로 접힘).

## 더 읽어야 할 때 — 비공개, `_docs/_portal/`

| 문서 | 언제 |
|---|---|
| `SFP_결정로그_v1_0.md` | 왜 그렇게 정했나 — 결정 ID로 |
| `SFP_작업추적대장_v1_0.md` | 언제 무엇을 바꿨나 — 해당 SFP 항목만 |
| `SFP-013_인계파일_v1_3.md` · `SFP-012_소급인계_…md` | 8/26 실물 대조 배경 (**계보 종료**, 참조 전용) |

> **기본 진입 범위이지 금지 목록이 아니다.** 어긋날 때·근거가 부족할 때·과거 이유를 볼 때는 원문 검색 가능. 찾은 건 이 표에 추가.
