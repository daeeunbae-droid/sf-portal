#!/usr/bin/env python3
"""
STATE CHECK — STATE.md 의 기계 확인 가능한 주장만 실물과 대조한다.

이것은 STATE 생성기가 아니다. 생성기로 만들면 사람 판단 필드까지 기계가 지어내고,
그러면 STATE 는 다시 믿을 수 없는 문서가 된다.

■ 이 스크립트가 하는 일
  ✓  주장이 실물과 같다
  ✗  주장이 실물과 다르다 / STATE 가 코드보다 뒤처졌다      → 종료코드 1
  !  주의 — 커밋 안 된 작업이 남아 있다                      → 종료코드 1 (--warn-ok 로 완화)
  ·  알림 — 막지는 않는다 (push 안 됨 등)
  ?  사람 판단 필드. 검사하지 않는다.

■ 이 스크립트가 **하지 않는** 일 — 착각 금지
  - STATE 가 "정확한지"는 못 본다. 같은 시점에서 정본을 잘못 골라도 ✓ 가 뜬다.
    신선도(freshness)는 정확성이 아니다.
  - 종료 조건 3개를 검사하지 않는다. **결정로그·작업대장 누락은 탐지하지 못한다.**
    코드는 커밋되고 STATE 도 갱신됐는데 두 로그만 빠뜨린 경우 이 스크립트는 PASS 한다.
    즉 "기계적으로 관측 가능한 일부 미종료 신호"만 잡는다.
  - 배포본(GitHub Pages)·Firebase 실데이터는 보지 않는다. 그건 별도 실물이다.
  - `origin/...` 은 **remote-tracking ref**(마지막 fetch 시점의 사본)다. 진짜 원격이 아니다.
    `--fetch` 를 주면 먼저 fetch 한다.

■ 신선도를 어떻게 보는가 — STATE 에 HEAD 해시를 적지 않는 이유
  STATE 는 git 에 추적된다. 자기 자신을 포함한 현재 HEAD 를 안에 적으면
  「적는다 → 커밋한다 → HEAD 가 바뀐다 → 틀린다」가 끝없이 돈다.
  그래서 해시를 적지 않고 **git 이력에서 직접 계산**한다.

      STATE 를 마지막으로 건드린 커밋   vs   감시 대상 파일을 마지막으로 건드린 커밋

  후자가 전자보다 뒤(자손)면 STATE 가 뒤처진 것이다.
  같은 커밋에 함께 넣어도, 코드 뒤에 STATE 마감 커밋을 따로 만들어도 통과한다.

사용:  python3 _tools/state/state.py [--state STATE.md] [--repo .] [--warn-ok] [--fetch]
"""

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

OK, BAD, WARN, NOTE, SKIP = "✓", "✗", "!", "·", "?"

DEFAULT_STALE_IGNORE = "STATE.md, CLAUDE.md, README.md, .gitignore"


class Report:
    def __init__(self):
        self.rows = []
        self.failed = False
        self.warned = False

    def add(self, mark, label, detail=""):
        self.rows.append((mark, label, detail))
        if mark == BAD:
            self.failed = True
        if mark == WARN:
            self.warned = True

    def render(self):
        print("STATE CHECK")
        for mark, label, detail in self.rows:
            print(f"  {mark} {label}" + (f" — {detail}" if detail else ""))


def git(repo, *args):
    """성공하면 stdout(문자열, 빈 문자열 가능), 실패하면 None."""
    try:
        out = subprocess.run(
            ["git", "--no-optional-locks", *args],
            cwd=repo, capture_output=True, text=True, timeout=30,
        )
        return out.stdout.strip() if out.returncode == 0 else None
    except Exception:
        return None


def parse_block(state_text):
    m = re.search(r"```state-check\s*\n(.*?)```", state_text, re.S)
    if not m:
        return None
    fields = {}
    for raw in m.group(1).splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        k, v = line.split(":", 1)
        fields[k.strip()] = v.strip()
    return fields


def csv_list(value):
    return [p.strip() for p in (value or "").split(",") if p.strip()]


def tool_url(index_html, key):
    m = re.search(r"const\s+TOOL_URL\s*=\s*\{(.*?)\}", index_html, re.S)
    if not m:
        return None
    m2 = re.search(rf"{key}\s*:\s*'([^']+)'", m.group(1))
    return m2.group(1) if m2 else None


def wb_md5(html, book):
    """WB["<book>"] 의 md5. 관례: `"<book>":{...}` 원문 그대로 (SFP-012 a6b7968 산식)."""
    m = re.search(r"(?:const|let|var)\s+WB\s*=\s*\{", html)
    if not m:
        return None
    start = html.index("{", m.start())
    depth, i = 0, start
    while True:
        depth += (html[i] == "{") - (html[i] == "}")
        if depth == 0:
            break
        i += 1
    wb = html[start:i + 1]
    key = json.dumps(book, ensure_ascii=False)
    if key not in wb:
        return None
    ks = wb.index(key)
    vs = wb.index("{", ks)
    depth, j = 0, vs
    while True:
        depth += (wb[j] == "{") - (wb[j] == "}")
        if depth == 0:
            break
        j += 1
    return hashlib.md5(wb[ks:j + 1].encode("utf-8")).hexdigest()


def check_freshness(repo, r, state_rel, ignore):
    """STATE 가 코드보다 뒤처졌는가. 자기참조 없이 git 이력으로만 판정."""
    state_commit = git(repo, "log", "-1", "--format=%H", "--", state_rel)
    if state_commit is None:
        r.add(SKIP, "STATE 신선도", "git 이력을 못 읽음")
        return
    if not state_commit:
        r.add(NOTE, "STATE 신선도", f"{state_rel} 이 아직 커밋되지 않음 — 첫 배치로 본다")
        return

    pathspec = [":(exclude)" + p for p in ignore]
    ops_commit = git(repo, "log", "-1", "--format=%H", "--", ".", *pathspec)
    if ops_commit is None:
        r.add(SKIP, "STATE 신선도", "감시 대상 이력을 못 읽음")
        return
    if not ops_commit:
        r.add(OK, "STATE 신선도", "감시 대상 커밋 없음")
        return

    # ops_commit 이 state_commit 의 조상(또는 동일)이면 STATE 가 최신이다.
    res = subprocess.run(
        ["git", "--no-optional-locks", "merge-base", "--is-ancestor", ops_commit, state_commit],
        cwd=repo, capture_output=True, text=True,
    )
    if res.returncode == 0:
        r.add(OK, "STATE 신선도", f"마지막 실물 커밋 {ops_commit[:7]} 이후 갱신됨")
    else:
        subject = git(repo, "log", "-1", "--format=%s", ops_commit) or ""
        r.add(BAD, "STATE 가 코드보다 뒤처짐",
              f"실물 커밋 {ops_commit[:7]} ({subject[:40]}) 이 STATE 커밋 "
              f"{state_commit[:7]} 보다 나중 → 지난 바퀴가 안 닫혔을 수 있다")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--state", default="STATE.md")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--warn-ok", action="store_true", help="! 만 있으면 종료코드 0")
    ap.add_argument("--fetch", action="store_true", help="원격 비교 전에 git fetch")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    state_path = repo / args.state
    r = Report()

    if not state_path.exists():
        print(f"STATE CHECK\n  {BAD} {args.state} 없음 — 이 저장소에 STATE 가 없다.")
        return 1

    fields = parse_block(state_path.read_text(encoding="utf-8"))
    if fields is None:
        r.add(BAD, "state-check 블록 없음",
              "STATE.md 에 ```state-check 블록이 있어야 기계 대조가 된다")
        r.render()
        return 1

    if "head" in fields:
        r.add(BAD, "state-check 에 head 가 있다",
              "STATE 는 자기 자신이 든 HEAD 를 가질 수 없다(순환). 이 줄을 지운다")

    # ── 1. 신선도 — STATE 가 코드보다 뒤처졌는가 ────────────────────
    ignore = csv_list(fields.get("stale_ignore", DEFAULT_STALE_IGNORE)) + [args.state]
    check_freshness(repo, r, args.state, sorted(set(ignore)))

    # ── 2. 커밋 안 된 작업 ─────────────────────────────────────────
    dirty = git(repo, "status", "--porcelain", "-uall")
    if dirty is None:
        r.add(BAD, "git status 실패", "저장소가 아니거나 git 을 못 쓴다 — 검사 결과를 믿지 말 것")
    elif dirty:
        r.add(WARN, f"working tree 변경 {len(dirty.splitlines())}건", "커밋되지 않은 작업이 남아 있다")
    else:
        r.add(OK, "working tree clean")

    # ── 3. 원격 — 알림일 뿐, 막지 않는다 ───────────────────────────
    # 종료 조건은 "커밋 해시 확보"까지다. push 는 종료 조건이 아니다.
    if args.fetch:
        git(repo, "fetch", "--quiet")
    upstream = git(repo, "rev-parse", "--abbrev-ref", "@{u}")
    if not upstream:
        r.add(SKIP, "원격", "upstream 없음")
    else:
        counts = git(repo, "rev-list", "--left-right", "--count", f"{upstream}...HEAD")
        stamp = "" if args.fetch else " (remote-tracking ref — 마지막 fetch 시점)"
        if counts is None:
            r.add(SKIP, "원격", "비교 실패")
        else:
            behind, ahead = (counts.split() + ["0", "0"])[:2]
            if ahead != "0":
                r.add(NOTE, f"{upstream} 보다 {ahead} 커밋 앞섬{stamp}", "push 안 됨 — 막지 않는다")
            if behind != "0":
                r.add(NOTE, f"{upstream} 보다 {behind} 커밋 뒤짐{stamp}", "pull 필요")
            if ahead == "0" and behind == "0":
                r.add(OK, f"{upstream} 와 동기{stamp}")

    # ── 4. 정본 포인터 ────────────────────────────────────────────
    index_file = repo / fields.get("index", "index.html")
    index_html = index_file.read_text(encoding="utf-8") if index_file.exists() else None
    if index_html is None:
        r.add(SKIP, "정본 포인터", f"{index_file.name} 없음")
    else:
        for field, key in (("voca_entry", "voca"), ("structure_entry", "structure")):
            declared = fields.get(field)
            if not declared:
                continue
            actual = tool_url(index_html, key)
            if actual is None:
                r.add(BAD, f"TOOL_URL.{key}", "index.html 에서 못 찾음")
            elif actual == declared:
                r.add(OK, f"TOOL_URL.{key} = {actual}")
            else:
                r.add(BAD, f"TOOL_URL.{key} 불일치", f"STATE={declared} / 실제={actual}")

    # ── 5. 존재해야 하는 파일 ─────────────────────────────────────
    for name in csv_list(fields.get("must_exist")):
        exists = (repo / name).exists()
        r.add(OK if exists else BAD, f"존재 {name}", "" if exists else "사라졌다")

    # ── 6. WB md5 (불변식) ────────────────────────────────────────
    for k, declared in fields.items():
        if not k.startswith("wb_md5."):
            continue
        book = k[len("wb_md5."):]
        target_name = fields.get("voca_entry")
        target = repo / target_name if target_name else None
        if not target or not target.exists():
            r.add(SKIP, f"WB[{book}] md5", "대상 파일 없음")
            continue
        actual = wb_md5(target.read_text(encoding="utf-8"), book)
        if actual is None:
            r.add(BAD, f"WB[{book}] md5", f"{target.name} 안에서 못 찾음")
        elif actual == declared:
            r.add(OK, f"WB[{book}] md5 = {actual[:12]}…")
        else:
            r.add(BAD, f"WB[{book}] md5 불일치", f"STATE={declared[:12]}… / 실제={actual[:12]}…")

    # ── 7. 사람 판단 필드 — 검사하지 않는다 ────────────────────────
    r.add(SKIP, "Active item · 열린 미결 · 확정된 방향", "사람 판단 — 검사 대상 아님")
    r.add(SKIP, "결정로그 · 작업대장 등재 여부", "**이 스크립트는 못 본다** — 사람이 확인한다")

    r.render()
    print()
    if r.failed:
        print("FAIL — STATE 의 주장이 실물과 다르거나 STATE 가 뒤처졌다. 고치고 다시 돌린다.")
        return 1
    if r.warned and not args.warn_ok:
        print("WARN — 커밋 안 된 작업이 있다. 닫고 다시 돌린다.")
        return 1
    print("PASS — 기계 확인 가능한 필드만 실물과 일치. "
          "정확성도, 결정로그·작업대장 등재도 보장하지 않는다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
