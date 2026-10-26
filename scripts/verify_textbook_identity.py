"""Compare local PDFs with saved current official catalogue and file metadata."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def multipart_digest(data, part_size=8 * 1024 * 1024):
    parts = [hashlib.md5(data[i:i + part_size]).digest()
             for i in range(0, len(data), part_size)]
    return hashlib.md5(b''.join(parts)).hexdigest() + '-' + str(len(parts))


def verify(root=ROOT):
    sources = json.loads((root / 'reference/textbook-sources.json').read_text())
    catalog_path = root / 'reference/smartedu-current-catalog.json'
    catalog = json.loads(catalog_path.read_text())
    books = {b['id']: b for b in catalog['books']}
    results = []
    for source in sources:
        key = source['key']
        bid = source['edition_id'][3:39]
        metadata_path = root / f'reference/edition-provenance/{key}-official.json'
        metadata = json.loads(metadata_path.read_text())
        file = next(x for x in metadata['ti_items']
                    if x.get('ti_format') == 'pdf' and x.get('ti_is_source_file'))
        data = (root / f'private-content/textbooks/{key}.pdf').read_bytes()
        requirements = {x['name']: x['value']
                        for x in file['custom_properties']['requirements']}
        checks = {
            'resource_id': metadata['id'] == bid == books[bid]['id'],
            'current_update': metadata['update_time'] == books[bid]['update_time'],
            'bytes': len(data) == file['ti_size'] == books[bid]['custom_properties']['size'],
            'pages': source['pages'] == int(requirements['pagesize']),
            'sha256': hashlib.sha256(data).hexdigest() == source['sha256'],
            'multipart_digest': multipart_digest(data) == file['ti_md5'],
        }
        if not all(checks.values()):
            raise ValueError(f'{key}: identity mismatch: {checks}')
        results.append({
            'key': key, 'checks': checks, 'resource_id': bid,
            'official_update_time': metadata['update_time'],
            'official_file_digest': file['ti_md5'],
            'digest_method': 'MD5 of concatenated binary MD5 digests of 8 MiB parts, followed by part count',
            'sha256': hashlib.sha256(data).hexdigest(),
            'metadata_sha256': hashlib.sha256(metadata_path.read_bytes()).hexdigest(),
            'source_url': f'https://s-file-1.ykt.cbern.com.cn/zxx/ndrv2/resources/tch_material/details/{bid}.json',
        })
    return {'checked_at': catalog['checked_at'], 'catalog_sha256':
            hashlib.sha256(catalog_path.read_bytes()).hexdigest(), 'books': results}


if __name__ == '__main__':
    result = verify()
    (ROOT / 'reference/textbook-identity-verification.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f"PASS: {len(result['books'])} current official textbook files match local PDFs")
