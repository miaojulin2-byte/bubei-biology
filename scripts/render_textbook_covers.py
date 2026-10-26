"""Create local cover thumbnails from the five verified textbook PDFs."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
output = ROOT / 'app/reviewed/covers'
output.mkdir(exist_ok=True)
for key in ['b1', 'b2', 'x1', 'x2', 'x3']:
    source = ROOT / f'private-content/textbooks/{key}.pdf'
    if not source.is_file():
        raise SystemExit(f'缺少本地教材：{source}')
    subprocess.run(['pdftoppm', '-f', '1', '-singlefile', '-scale-to', '640',
                    '-jpeg', str(source), str(output / key)], check=True)
print('Five local textbook cover thumbnails generated')
