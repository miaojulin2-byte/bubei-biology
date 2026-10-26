"""Fail closed: a release needs item-level evidence and a verified current edition.

QA builds may contain fixtures. Download dates and similarity scores never approve
content. The ledger is separate from extracted Anki notes so re-extraction cannot
overwrite review decisions.
"""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':')).encode()).hexdigest()

def validate(cards, ledger, editions):
    errors = []
    reviews = ledger.get('items', {})
    if not cards:
        errors.append('正式题库为空')
    if len({c['id'] for c in cards}) != len(cards):
        errors.append('题目 ID 重复')
    for card in cards:
        cid = card['id']
        review = reviews.get(cid, {})
        if review.get('status') != 'approved':
            errors.append(f'{cid}: 未逐条核对通过')
            continue
        if review.get('content_sha256') != digest(card):
            errors.append(f'{cid}: 内容已改变，须重新核对')
        if not review.get('reviewer') or not review.get('reviewed_at'):
            errors.append(f'{cid}: 缺少审核记录')
        evidence = review.get('evidence', [])
        if not evidence:
            errors.append(f'{cid}: 缺少教材原文证据')
        for ref in evidence:
            edition = editions.get(ref.get('book_key'), {})
            latest = edition.get('latest_verification', {})
            if (latest.get('status') != 'confirmed' or
                    not latest.get('source_url') or not latest.get('checked_at') or
                    not latest.get('basis')):
                errors.append(f'{cid}: 教材最新版本尚未确认')
            if not edition.get('sha256') or ref.get('sha256') != edition.get('sha256'):
                errors.append(f'{cid}: 教材文件指纹不匹配')
            page = ref.get('pdf_page')
            if type(page) is not int or not 1 <= page <= edition.get('pages', 0):
                errors.append(f'{cid}: 教材页码无效')
            if not ref.get('locator') or not ref.get('reason'):
                errors.append(f'{cid}: 缺少原文定位或核对结论')
    return errors

def load_cards():
    code = """const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({});
    for(const f of ['data.js','catalog.js'])vm.runInContext(fs.readFileSync('app/assets/'+f,'utf8'),ctx);
    process.stdout.write(vm.runInContext('JSON.stringify(CARDS)',ctx));"""
    return json.loads(subprocess.check_output(['node', '-e', code], cwd=ROOT))

if __name__ == '__main__':
    ledger = json.loads((ROOT/'reference/content-audit.json').read_text())
    editions = {x['key']: x for x in json.loads((ROOT/'reference/textbook-sources.json').read_text())}
    cards = load_cards()
    errors = validate(cards, ledger, editions)
    if errors:
        print(f'正式包审核未通过：{len(cards)} 条内容，{len(errors)} 个未满足条件。')
        print('\n'.join(errors[:10]))
        print('不生成正式 APK。QA 包仅用于功能调试。')
        raise SystemExit(1)
    print(f'正式题库审核检查通过：{len(cards)} 条。')
