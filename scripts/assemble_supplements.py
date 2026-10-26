"""Assemble the reviewed section audit without replacing community content."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['coverage-b1-b2.json', 'coverage-x1.json', 'coverage-x2-x3.json']


def assemble():
    folder = ROOT / 'private-content/coverage'
    books, notes, items, corrections = [], [], {}, []
    for name in FILES:
        data = json.loads((folder / name).read_text())
        if set(items) & set(data['items']):
            raise ValueError('补充审核 ID 重复')
        books.extend(data['books'])
        notes.extend(data['notes'])
        items.update(data['items'])
        corrections.extend(data.get('metadata_corrections', []))
    if {n['note_id'] for n in notes} != set(items) or len(notes) != len(items):
        raise ValueError('补充内容与审核记录不一致')
    catalog = json.loads((ROOT / 'reference/textbook-sections.json').read_text())
    expected = {(b['book'], s['chapter'], s['section']) for b in catalog['books'] for s in b['sections']}
    actual = [(b['book'], s['chapter'], s['section']) for b in books for s in b['sections']]
    if len(actual) != len(expected) or set(actual) != expected:
        raise ValueError('覆盖检查没有逐节对应教材目录')
    supplement = {'schema': 1, 'checked_at': '2026-10-26', 'notes': notes, 'items': items}
    report = {
        'checked_at': '2026-10-26',
        'scope': '82个正文节逐节检查；代表性记忆卡与具体缺口清单，不宣称全考点或新情境掌握。',
        'books': sorted(books, key=lambda b: b['book']),
        'metadata_corrections': corrections,
    }
    (ROOT / 'private-content/supplemental-reviewed.json').write_text(json.dumps(supplement, ensure_ascii=False, indent=2) + '\n')
    (folder / 'coverage-combined.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f'Assembled {len(actual)} section records and {len(notes)} supplemental notes; validate before packaging')


if __name__ == '__main__':
    assemble()
