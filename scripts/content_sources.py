"""Combine the original community audit with explicitly reviewed supplements.

Keep the original note IDs and decisions intact so upgrades retain study records
and the community audit remains reproducible.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_sources(root=ROOT):
    private = root / 'private-content'
    notes = json.loads((private / 'candidate-notes.json').read_text())
    ledger = json.loads((private / 'note-audit.json').read_text())
    supplement = private / 'supplemental-reviewed.json'
    if not supplement.exists():
        return notes, ledger
    extra = json.loads(supplement.read_text())
    originals = {str(n['note_id']) for n in notes}
    additions = extra['notes']
    reviews = extra['items']
    ids = [str(n['note_id']) for n in additions]
    if len(set(ids)) != len(ids) or set(ids) & (originals | set(ledger['items'])):
        raise ValueError('补充内容 ID 重复或覆盖原始条目')
    if set(ids) != set(reviews):
        raise ValueError('补充内容与审核记录没有逐条对应')
    for note in additions:
        if not note.get('origin'):
            raise ValueError('补充内容缺少来源说明')
        parent = note.get('source_note_id')
        if parent is not None and str(parent) not in originals:
            raise ValueError('修订内容引用的社区原条目不存在')
    return notes + additions, {**ledger, 'items': {**ledger['items'], **reviews}}
