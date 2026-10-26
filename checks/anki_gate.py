"""Synthetic fixtures only: verify filtering, cloze grouping and stale reviews."""
import copy
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from compile_reviewed_anki import candidate_digest, compile_notes, convert

note = {'note_id': 'fixture', 'model_type': 1, 'media': [], 'book': 0, 'chapter': 1,
        'fields': ['甲{{c1::乙::提示}}丙{{c2::丁}}戊{{c1::己}}', '']}
edition = {'b1': {'sha256': 'fixture-hash', 'pages': 10, 'latest_verification': {
    'status': 'confirmed', 'source_url': 'https://example.org/fixture',
    'checked_at': 'test', 'basis': 'synthetic test fixture'}}}
review = {'status': 'approved', 'release_eligible': True,
          'candidate_sha256': candidate_digest(note), 'reviewer': 'fixture',
          'reviewed_at': 'test', 'evidence': [{'book_key': 'b1', 'sha256': 'fixture-hash',
          'pdf_page': 2, 'locator': 'fixture', 'reason': 'synthetic fixture'}]}
ledger = {'items': {'fixture': review}}
cards = convert(note)
assert len(cards) == 2
assert [p['text'] for p in cards[0]['parts'] if p['hidden']] == ['乙', '己']
assert [p['text'] for p in cards[1]['parts'] if p['hidden']] == ['丁']
assert cards[0]['parts'][1]['hint'] == '提示'
assert ''.join(p['text'] for p in cards[0]['parts']) == '甲乙丙丁戊己'
payload, rejected = compile_notes([note], ledger, edition)
assert len(payload['cards']) == 2 and not rejected
for status in ('content_verified', 'pending', 'excluded'):
    changed = copy.deepcopy(ledger)
    changed['items']['fixture']['status'] = status
    assert not compile_notes([note], changed, edition)[0]['cards']
changed = copy.deepcopy(note)
changed['fields'][0] += '改变'
assert not compile_notes([changed], ledger, edition)[0]['cards']
changed = copy.deepcopy(edition)
changed['b1']['latest_verification']['status'] = 'pending'
assert not compile_notes([note], ledger, changed)[0]['cards']
for text in ('{{c1::}}', '{{c1::嵌套{{c2::答案}}}}', '无填空'):
    changed = {**note, 'fields': [text, '']}
    try:
        convert(changed)
        raise AssertionError('accepted malformed cloze')
    except ValueError:
        pass
try:
    compile_notes([note, note], ledger, edition)
    raise AssertionError('accepted duplicate ID')
except ValueError:
    pass
print('PASS: cloze grouping/hints, pending/excluded/changed/obsolete filtering, duplicate rejection')

# Synthetic Basic fixtures bind question, answer, image position and image bytes.
import tempfile
from compile_reviewed_anki import context_digest, media_manifest
basic = {'note_id':'basic-fixture','model':'Basic','model_type':0,'book':0,'chapter':1,
         'fields':['问题','答案'],'raw_fields':['问题','答案'],'media':[]}
br = {**review,'candidate_sha256':candidate_digest(basic),'context_sha256':context_digest(basic),'media_review':[]}
assert convert(basic,br)[0]['kind'] == 'basic-self-report'
assert len(compile_notes([basic],{'items':{'basic-fixture':br}},edition)[0]['cards']) == 1
with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);image=root/'test.png';image.write_bytes(b'\x89PNG\r\n\x1a\nfixture')
    basic.update(fields=['问题',''],raw_fields=['问题','<img src="test.png">'],media=['test.png'])
    br.update(candidate_sha256=candidate_digest(basic),context_sha256=context_digest(basic),media_review=media_manifest(basic,root))
    assert convert(basic,br,root)[0]['images'][0]['field']==1
    image.write_bytes(b'\x89PNG\r\n\x1a\nchanged')
    try: convert(basic,br,root);raise AssertionError('changed image accepted')
    except ValueError: pass
    changed=copy.deepcopy(basic);changed['raw_fields'].reverse()
    try: convert(changed,br,root);raise AssertionError('moved answer image accepted')
    except ValueError: pass
    changed['raw_fields']=['问题','<img src="../test.png">'];changed['media']=['../test.png']
    try: media_manifest(changed,root);raise AssertionError('path traversal accepted')
    except ValueError: pass
print('PASS: Basic content/context gate; changed image, moved answer and traversal rejected')

# A cloze's unchanged text must not authorize a different textbook chapter.
context_ledger=copy.deepcopy(ledger)
context_ledger['items']['fixture']['context_sha256']=context_digest(note)
changed={**note,'chapter':2}
assert not compile_notes([changed],context_ledger,edition)[0]['cards']
print('PASS: cloze chapter/context edits invalidate prior approval')
