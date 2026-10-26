"""Prevent pending, changed, or obsolete-reference content from shipping."""
import copy
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('audit', Path(__file__).resolve().parents[1]/'scripts/release_audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
card = {'id': 'test-only', 'text': 'fixture'}
edition = {'b1': {'sha256': 'fixture-hash', 'pages': 100,
    'latest_verification': {'status': 'confirmed', 'source_url': 'https://example.org/test-fixture',
        'checked_at': 'test-only', 'basis': 'test fixture, not actual textbook verification'}}}
ledger = {'items': {'test-only': {'status': 'approved', 'content_sha256': audit.digest(card),
    'reviewer': 'test-fixture', 'reviewed_at': 'test-only',
    'evidence': [{'book_key': 'b1', 'sha256': 'fixture-hash', 'pdf_page': 5,
                  'locator': 'test fixture', 'reason': 'test fixture'}]}}}
assert not audit.validate([card], ledger, edition)
assert audit.validate([card], {'items': {}}, edition)
assert audit.validate([{**card, 'text': 'changed'}], ledger, edition)
for change in ['pending', 'rejected', 'corrected_pending']:
    altered = copy.deepcopy(ledger)
    altered['items']['test-only']['status'] = change
    assert audit.validate([card], altered, edition)
for field in ['source_url', 'checked_at', 'basis']:
    altered = copy.deepcopy(edition)
    del altered['b1']['latest_verification'][field]
    assert audit.validate([card], ledger, altered)
altered = copy.deepcopy(edition)
altered['b1']['latest_verification']['status'] = 'pending'
assert audit.validate([card], ledger, altered)
altered = copy.deepcopy(ledger)
altered['items']['test-only']['evidence'][0]['sha256'] = 'old-edition'
assert audit.validate([card], altered, edition)
assert audit.validate([], ledger, edition)
print('审核准入检查通过：未审、改动、旧版依据、版本待确认均不能发布。')
