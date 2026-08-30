# STATE — sf-portal 현재 상태

> **현재상태 캐시(current-state cache).** 진실이 아니라 실물의 파생물이다. 어긋나면 **이 파일이 틀린 것이다.**
> **덮어쓴다** — 이유는 결정로그, 사건은 작업대장. **4KB는 경보선**(넘으면 사실을 빼지 말고 구조를 다시 본다).
> **공개 저장소다** — 민감 항목은 제목만, 상세는 비공개 문서.

**갱신** 2026-08-29 (SFP-015) · **기준선** 2026-08-26 실물 대조 = `검증됨` (단 Firebase는 미확인)

```state-check
index: index.html
voca_entry: SF_Word_Test_20.html
structure_entry: SF-Structure-Trainer.html
must_exist: SF_Word_Test_19.html, .nojekyll, _tools/sfp012/verify.js
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
| 배포(Pages) | 라이브 URL 실제 접속 | 2026-08-26 확인 — 전 경로 200 |
| Firebase | 실기기만. `verify.js`는 `memStore`로 떼고 돌림 | **미확인** |

「git이 사실」은 **코드에 한해서**다.

## 정본

| 무엇 | 파일 | 근거 |
|---|---|---|
| 포털 | `index.html` | — |
| Voca | `SF_Word_Test_20.html` | `TOOL_URL.voca` — 검사기가 대조 |
| Structure | `SF-Structure-Trainer.html` | `TOOL_URL.structure` — 검사기가 대조 |

`15_2 / 16 / 17 / 19` = 무참조 구버전. **19는 지우지 않는다**(롤백 스위치 + `verify.js`의 정답지). `18`은 결번.

## 불변식

- `WB["Voca 3000"]` md5 · `.nojekyll` [#SFP-013-4] — 검사기가 대조
- `RL` · `VOCA_SENTENCE_DATA` · `rAdmin` · Firebase `voca_sentence/*` · `voca3000/…/wrong/{YYYY-MM}` · `structure_trainer/results/*` — **미확인**(사람이 본다)

## 작업

**Active (≤1): 없음** · **다음 바퀴 = 관리자 화면 Phase III 가시화**(아래 Ready 첫 줄)

| 상태 | 항목 |
|---|---|
| Blocked | Voca 오답풀 책별 분리 — `v3Path()`에 `bookKey` 분기. **Firebase 스키마 = 승인 대기** [#SFP-012-4] |
| Ready | 관리자 화면 Phase III 가시화 [SFP-010 1순위] · 38번 Phase I/II 제작 |
| Urgent | 없음 |

## 열린 미결

| # | 내용 | 누구 |
|---|---|---|
| A | 구버전 처리 — 권고 A-2(19 남기고 `15_2·16·17` 삭제) | 승인 |
| C | `_tools/anatomy/` 비공개 백업처 — gitignore는 백업이 아니다 | 대은 |
| D | 단어 데이터 공개 범위 | 대은 |
| E | `verify.js`를 실제 gate에 연결(pre-commit) — 지금은 실행하라는 문장뿐 | 대기 |

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
