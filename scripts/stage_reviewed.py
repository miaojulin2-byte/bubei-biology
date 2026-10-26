"""Stage a personal APK with only individually approved content."""
import json
import shutil
from pathlib import Path
from compile_reviewed_anki import compile_notes, media_manifest
from release_audit import validate
from verify_textbook_identity import verify
from content_sources import load_sources

ROOT = Path(__file__).resolve().parents[1]

def stage():
    verify()
    notes, ledger = load_sources()
    sources = json.loads((ROOT/'reference/textbook-sources.json').read_text())
    editions = {x['key']: x for x in sources}
    payload, skipped = compile_notes(notes, ledger, editions)
    rejected_approved = [x for x in skipped if ledger.get('items', {}).get(x['note_id'], {}).get('release_eligible') is True]
    if rejected_approved:
        raise ValueError('已批准内容无法打包：' + json.dumps(rejected_approved, ensure_ascii=False))
    errors = validate(payload['cards'], payload['audit'], editions)
    if errors:
        raise ValueError('\n'.join(errors[:10]))
    dest = ROOT/'build/reviewed-assets'
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for name in ['style.css', 'scheduler.js', 'anki-core.js']:
        shutil.copy2(ROOT/'app/assets'/name, dest/name)
    shutil.copytree(ROOT/'app/assets/vendor', dest/'vendor')
    for source in (ROOT/'app/reviewed').iterdir():
        if source.is_file():
            shutil.copy2(source, dest/source.name)
    shutil.copytree(ROOT/'app/reviewed/covers', dest/'covers')
    included = {c['note_id'] for c in payload['cards'] if c['kind'] == 'basic-self-report'}
    for note in notes:
        if str(note['note_id']) not in included:
            continue
        manifest = media_manifest(note)
        if manifest != ledger['items'][str(note['note_id'])].get('media_review', []):
            raise ValueError('图片在打包期间改变，需重新审核')
        for item in manifest:
            target = dest/'media'/(item['sha256']+Path(item['filename']).suffix.lower())
            target.parent.mkdir(exist_ok=True)
            data = (ROOT/'private-content/media'/item['filename']).read_bytes()
            import hashlib
            if hashlib.sha256(data).hexdigest() != item['sha256']:
                raise ValueError('图片在打包期间改变')
            target.write_bytes(data)
    public = {'cards': sorted(payload['cards'], key=lambda c: (c['book'], c['chapter'], c['id'])), 'evidence': {
        cid: review['evidence'] for cid, review in payload['audit']['items'].items()},
        'checkedAt': '2026-10-26', 'books': [
            {'title': x['title'], 'update': x['latest_verification']['official_update_time']}
            for x in sources]}
    (dest/'reviewed-data.js').write_text('const REVIEWED = '+json.dumps(public, ensure_ascii=False)+';\n')
    print(f"Staged {len(payload['cards'])} approved cards; no original fixtures packaged")

if __name__ == '__main__':
    stage()
