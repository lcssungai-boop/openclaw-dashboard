#!/usr/bin/env python3
"""Generate Mobile Home customer list + per-customer brief markdown.

Source of truth: workspace memory indexes.
- memory/topics/system/index/customer_index.md
- memory/topics/system/index/project_index.md

Output:
- 線上儀表板/data/customers/recent.json
- 線上儀表板/data/customers/briefs/<customer>.md

Rule (per user):
- A: recent window 7 days by last_activity (if parseable)
- C: always produce a Top 10 (by followup_next date if parseable else last_activity)
- customer-first: even if multiple projects, group under customer
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path('/Users/sung/.openclaw/workspace')
DASH = ROOT / '線上儀表板'
OUT_RECENT = DASH / 'data' / 'customers' / 'recent.json'
OUT_BRIEFS_DIR = DASH / 'data' / 'customers' / 'briefs'

CUSTOMER_INDEX = ROOT / 'memory' / 'topics' / 'system' / 'index' / 'customer_index.md'
PROJECT_INDEX = ROOT / 'memory' / 'topics' / 'system' / 'index' / 'project_index.md'
EVENTS_DIR = ROOT / 'memory' / 'topics' / 'customers'


def parse_md_table(path: Path):
    text = path.read_text(encoding='utf-8')
    lines = [l.strip() for l in text.splitlines()]
    rows = []
    in_table = False
    headers = []
    for l in lines:
        if l.startswith('|') and '---' in l:
            # separator row
            continue
        if l.startswith('|'):
            cols = [c.strip() for c in l.strip('|').split('|')]
            if not in_table:
                headers = cols
                in_table = True
                continue
            if headers and len(cols) == len(headers):
                rows.append(dict(zip(headers, cols)))
    return rows


def parse_date_ymd(s: str) -> datetime | None:
    if not s:
        return None
    m = re.search(r'(\d{4}-\d{2}-\d{2})', s)
    if not m:
        return None
    try:
        return datetime.strptime(m.group(1), '%Y-%m-%d')
    except Exception:
        return None


def load_projects_by_customer():
    if not PROJECT_INDEX.exists():
        return {}
    rows = parse_md_table(PROJECT_INDEX)
    by_c = {}
    for r in rows:
        cid = r.get('customer_id')
        if not cid or cid == 'C-TBD':
            continue
        by_c.setdefault(cid, []).append({
            'project_id': r.get('project_id'),
            'project_name': r.get('project_name'),
            'stage': r.get('stage'),
            'priority': r.get('priority'),
            'due_date': r.get('due_date'),
            'source_path': r.get('source_path'),
        })
    return by_c


def build_brief(customer, projects):
    name = customer['customer_name']
    cid = customer['customer_id']
    status = customer.get('status','')
    follow = customer.get('followup_next','')
    notes = customer.get('notes','')
    last = customer.get('last_activity','')

    # find latest event file if exists
    ev_dir = EVENTS_DIR / name
    ev_file = None
    if ev_dir.exists():
        files = sorted(ev_dir.glob('*.md'))
        if files:
            ev_file = files[-1].name

    md = []
    md.append(f"# {name}｜手機一頁總覽")
    md.append("")
    md.append(f"- customer_id：{cid}")
    md.append(f"- status：{status}")
    md.append(f"- last_activity：{last}")
    md.append(f"- followup_next：{follow}")
    md.append("")

    if notes and notes != '-':
        md.append('## 近況')
        md.append(f"- {notes}")
        md.append('')

    if projects:
        md.append('## 子專案（點選回主儀表板對應角色頁）')
        for p in projects:
            # link to project folder path is not web-safe; show name only
            md.append(f"- {p.get('project_id','')} {p.get('project_name','') or ''}（stage={p.get('stage','-')}）")
        md.append('')

    if ev_file:
        md.append('## 最新事件紀錄')
        md.append(f"- {ev_file}")
        md.append('')

    md.append('## 下一步')
    md.append('- （依 followup_next 執行；需要我幫你拆成任務可直接說）')
    md.append('')

    return '\n'.join(md).strip() + '\n'


def main():
    OUT_BRIEFS_DIR.mkdir(parents=True, exist_ok=True)

    customers = parse_md_table(CUSTOMER_INDEX)
    projects_by_c = load_projects_by_customer()

    # normalize
    now = datetime.now()
    window_start = now - timedelta(days=7)

    enriched = []
    for c in customers:
        cid = c.get('customer_id')
        name = c.get('customer_name')
        if not cid or not name:
            continue
        last_dt = parse_date_ymd(c.get('last_activity',''))
        follow_dt = parse_date_ymd(c.get('followup_next',''))
        enriched.append({
            **c,
            '_last_dt': last_dt,
            '_follow_dt': follow_dt,
            'projects': projects_by_c.get(cid, []),
        })

    # recent window
    recent = [c for c in enriched if c['_last_dt'] and c['_last_dt'] >= window_start]

    # top 10 by followup_next else last_activity
    def sort_key(c):
        d = c['_follow_dt'] or c['_last_dt'] or datetime(2099,1,1)
        return d

    top10 = sorted(enriched, key=sort_key)[:10]

    # union (preserve order by sort_key)
    union = {c['customer_id']: c for c in (recent + top10)}
    final = sorted(union.values(), key=sort_key)

    # write briefs
    for c in final:
        brief = build_brief(c, c.get('projects', []))
        (OUT_BRIEFS_DIR / f"{c['customer_name']}.md").write_text(brief, encoding='utf-8')

    payload = {
        'updated_at': datetime.utcnow().isoformat(timespec='seconds') + 'Z',
        'count': len(final),
        'items': [
            {
                'customer_id': c['customer_id'],
                'customer_name': c['customer_name'],
                'status': c.get('status',''),
                'followup_next': c.get('followup_next',''),
                'last_activity': c.get('last_activity',''),
                'priority': c.get('priority',''),
                'projects': c.get('projects', []),
                'recent_event': c.get('notes','') if c.get('notes','') not in (None,'','-') else '',
                'brief_md': f"briefs/{c['customer_name']}.md",
            }
            for c in final
        ]
    }

    OUT_RECENT.parent.mkdir(parents=True, exist_ok=True)
    OUT_RECENT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'ok': True, 'count': len(final), 'out': str(OUT_RECENT)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
