"""Export only individually approved plain-text cloze notes for personal use.

Content verification alone is insufficient. The edition gate and source hash
must still pass. Never execute community HTML or Anki templates.
"""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from release_audit import digest, validate

ROOT = Path(__file__).resolve().parents[1]
CLOZE = re.compile(r'\{\{c([1-9]\d*)::([^{}]+?)\}\}')

def candidate_digest(note):
    # Matches the existing field-level review ledger.
    return hashlib.sha256(json.dumps(note['fields'], ensure_ascii=False).encode()).hexdigest()

def context_digest(note):
    return digest({k: note.get(k) for k in ('model', 'model_type', 'book', 'chapter', 'fields', 'raw_fields', 'media')})

class ImageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            self.images.append(dict(attrs).get('src', ''))

def media_manifest(note, media_root=None):
    root = media_root or ROOT/'private-content/media'
    result = []
    for field, raw in enumerate(note.get('raw_fields', [])):
        parser = ImageParser()
        parser.feed(raw)
        for filename in parser.images:
            if not filename or Path(filename).name != filename or '/' in filename or '\\' in filename:
                raise ValueError('图片路径不合法')
            path = root/filename
            if path.suffix.lower() not in ('.png', '.jpg', '.jpeg') or not path.is_file() or path.is_symlink():
                raise ValueError('图片格式或文件不支持')
            data = path.read_bytes()
            if not (data.startswith(b'\x89PNG\r\n\x1a\n') or data.startswith(b'\xff\xd8\xff')):
                raise ValueError('图片文件签名不匹配')
            result.append({'filename': filename, 'field': field, 'sha256': hashlib.sha256(data).hexdigest()})
    if sorted(set(x['filename'] for x in result)) != sorted(set(note.get('media', []))):
        raise ValueError('图片清单与卡片字段不一致')
    return result

def convert(note, review=None, media_root=None):
    if type(note.get('book')) is not int or not 0 <= note['book'] < 5:
        raise ValueError('教材归属缺失')
    if type(note.get('chapter')) is not int or note['chapter'] < 1:
        raise ValueError('章节归属缺失')
    if note.get('model_type') == 0 and note.get('model') == 'Basic':
        fields = note['fields']
        if len(fields) != 2 or len(note.get('raw_fields', [])) != 2 or not fields[0].strip():
            raise ValueError('问答字段或题干缺失')
        if not review or review.get('context_sha256') != context_digest(note):
            raise ValueError('问答题完整字段及归属尚未核对')
        media = media_manifest(note, media_root)
        if media != review.get('media_review', []):
            raise ValueError('图片内容或位置已改变，须重新审核')
        if not fields[1].strip() and not any(x['field'] == 1 for x in media):
            raise ValueError('答案为空')
        return [{'id': f"anki-{note['note_id']}-basic", 'note_id': str(note['note_id']),
                 'kind': 'basic-self-report', 'book': note['book'], 'chapter': note['chapter'],
                 'parts': [{'text': fields[0], 'hidden': False}, {'text': fields[1], 'hidden': True}],
                 'images': [{'src': 'media/'+x['sha256']+Path(x['filename']).suffix.lower(),
                             'field': x['field']} for x in media]}]
    if note.get('model_type') != 1 or note.get('media'):
        raise ValueError('仅支持已审核的纯文字 Cloze')
    fields = note['fields']
    if not fields or any(str(x).strip() for x in fields[1:]):
        raise ValueError('附加字段须单独支持和审核')
    text = fields[0]
    matches = list(CLOZE.finditer(text))
    if not matches or '{{' in CLOZE.sub('', text) or '}}' in CLOZE.sub('', text):
        raise ValueError('不支持嵌套或异常填空标记')
    if type(note.get('book')) is not int or not 0 <= note['book'] < 5:
        raise ValueError('教材归属缺失')
    if type(note.get('chapter')) is not int or note['chapter'] < 1:
        raise ValueError('章节归属缺失')
    groups = sorted({int(m[1]) for m in matches})
    cards = []
    for group in groups:
        parts = []
        offset = 0
        for match in matches:
            if match.start() > offset:
                parts.append({'text': text[offset:match.start()], 'hidden': False})
            answer, _, hint = match[2].partition('::')
            if not answer.strip():
                raise ValueError('填空答案为空')
            parts.append({'text': answer, 'hidden': int(match[1]) == group, 'hint': hint})
            offset = match.end()
        if offset < len(text):
            parts.append({'text': text[offset:], 'hidden': False})
        cards.append({'id': f"anki-{note['note_id']}-c{group}",
                      'note_id': str(note['note_id']), 'kind': 'cloze-self-report',
                      'book': note['book'], 'chapter': note['chapter'], 'parts': parts})
    return cards

def compile_notes(notes, ledger, editions):
    cards, reviews, skipped = [], {}, []
    seen = set()
    for note in notes:
        nid = str(note['note_id'])
        if nid in seen:
            raise ValueError('重复笔记 ID: ' + nid)
        seen.add(nid)
        review = ledger.get('items', {}).get(nid, {})
        if review.get('status') != 'approved' or review.get('release_eligible') is not True:
            skipped.append({'note_id': nid, 'reason': '未完成最终审核'})
            continue
        if review.get('candidate_sha256') != candidate_digest(note):
            skipped.append({'note_id': nid, 'reason': '内容已改变，须重新审核'})
            continue
        if review.get('context_sha256') and review['context_sha256'] != context_digest(note):
            skipped.append({'note_id': nid, 'reason': '教材章节或完整字段已改变，须重新审核'})
            continue
        try:
            converted = convert(note, review)
        except ValueError as error:
            skipped.append({'note_id': nid, 'reason': str(error)})
            continue
        mapped = {c['id']: {**review, 'content_sha256': digest(c)} for c in converted}
        errors = validate(converted, {'items': mapped}, editions)
        if errors:
            skipped.append({'note_id': nid, 'reason': '; '.join(errors)})
            continue
        cards.extend(converted)
        reviews.update(mapped)
    return {'schema': 1, 'cards': cards, 'audit': {'items': reviews}}, skipped

if __name__ == '__main__':
    from content_sources import load_sources
    notes, ledger = load_sources()
    editions = {x['key']: x for x in json.loads((ROOT/'reference/textbook-sources.json').read_text())}
    payload, skipped = compile_notes(notes, ledger, editions)
    out = ROOT/'private-content/reviewed-deck.json'
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    (ROOT/'private-content/compile-report.json').write_text(json.dumps({
        'approved_cards': len(payload['cards']), 'excluded_notes': skipped
    }, ensure_ascii=False, indent=2))
    print(f"正式候选输出 {len(payload['cards'])} 张卡；过滤 {len(skipped)} 条笔记。")
