"""Check coverage inventory and supplemental evidence links, not factual mastery."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from content_sources import load_sources
from compile_reviewed_anki import candidate_digest, context_digest, convert
from release_audit import digest, validate

notes, ledger = load_sources()
by_id = {str(n['note_id']): n for n in notes}
catalog = json.loads((ROOT / 'reference/textbook-sections.json').read_text())
coverage = json.loads((ROOT / 'private-content/coverage/coverage-combined.json').read_text())
extra = json.loads((ROOT / 'private-content/supplemental-reviewed.json').read_text())
editions = {e['key']: e for e in json.loads((ROOT / 'reference/textbook-sources.json').read_text())}
expected = {(b['book'], s['chapter'], s['section']) for b in catalog['books'] for s in b['sections']}
actual = [(b['book'], s['chapter'], s['section']) for b in coverage['books'] for s in b['sections']]
assert len(actual) == len(set(actual)) and set(actual) == expected, '正文节记录缺失或重复'
added_ids = {n['note_id'] for n in extra['notes']}
assigned = set()
for book in coverage['books']:
    for section in book['sections']:
        assert isinstance(section['remaining_gaps'], list)
        for nid in section['existing_note_ids'] + section['additions']:
            note = by_id[nid]
            assert note['book'] == book['book'], '跨册归属错误'
            assert ledger['items'][nid]['status'] == 'approved'
        assert set(section['additions']) <= added_ids
        assigned.update(section['additions'])
assert assigned == added_ids, '补充卡片未关联到检查的正文节'

pages = {key: {p['pdf_page']: p['text'] for p in json.loads(
    (ROOT / f'private-content/textbooks/{key}.pages.json').read_text())} for key in editions}
compact = lambda s: re.sub(r'\s+', '', s)
for note in extra['notes']:
    review = ledger['items'][note['note_id']]
    assert review['candidate_sha256'] == candidate_digest(note)
    assert review['context_sha256'] == context_digest(note)
    assert review['release_eligible'] is True and review['status'] == 'approved'
    cards = convert(note, review)
    errors = validate(cards, {'items': {c['id']: {**review, 'content_sha256': digest(c)} for c in cards}}, editions)
    assert not errors, errors
    for evidence in review['evidence']:
        quote = compact(evidence.get('excerpt', ''))
        assert len(quote) >= 6, '缺少可核对的教材短摘'
        assert quote in compact(pages[evidence['book_key']][evidence['pdf_page']]), (note['note_id'], '摘录或页码不匹配')
print(f'PASS: {len(actual)} section records; {len(added_ids)} supplemental notes, IDs, audit hashes and source excerpts verified')
