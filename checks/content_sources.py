"""Supplement imports must not overwrite audited originals or lose provenance."""
import json
import sys
import tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from content_sources import load_sources

with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);p=root/'private-content';p.mkdir()
    (p/'candidate-notes.json').write_text(json.dumps([{'note_id':'original'}]))
    (p/'note-audit.json').write_text(json.dumps({'items':{'original':{'status':'approved'}}}))
    assert len(load_sources(root)[0])==1
    extra={'notes':[{'note_id':'supplement','origin':'教材修订','source_note_id':'original'}],
           'items':{'supplement':{'status':'approved'}}}
    def write(value): (p/'supplemental-reviewed.json').write_text(json.dumps(value))
    write(extra)
    notes,ledger=load_sources(root)
    assert len(notes)==2 and ledger['items']['original']=={'status':'approved'}
    for bad in [
        {'notes':[{'note_id':'original','origin':'教材补充'}],'items':{'original':{}}},
        {'notes':extra['notes']*2,'items':extra['items']},
        {'notes':extra['notes'],'items':{}},
        {'notes':[{'note_id':'supplement'}],'items':extra['items']},
        {'notes':[{'note_id':'supplement','origin':'教材修订','source_note_id':'unknown'}],'items':extra['items']}
    ]:
        write(bad)
        try: load_sources(root)
        except ValueError: pass
        else: raise AssertionError('Invalid supplement admitted')
print('PASS: supplemental ID collision, audit correspondence, origin and parent provenance guards')
