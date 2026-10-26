#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
PROJECT_ROOT="$PWD"
BIO_JAVA_HOME="$PROJECT_ROOT/tools/jdk/zulu17.62.17-ca-jdk17.0.17-macosx_aarch64/zulu-17.jdk/Contents/Home"
BIO_BUILD_TOOLS="$PROJECT_ROOT/tools/build-tools/android-15"
BIO_ANDROID_JAR="$PROJECT_ROOT/tools/platform/android-35/android.jar"
export JAVA_HOME="$BIO_JAVA_HOME"
export PATH="$BIO_JAVA_HOME/bin:$PATH"
BIO_APK_DIR="${BIO_APK_DIR:-$PROJECT_ROOT/../不背生物-APK}"
mkdir -p build/classes build/dex signing "$BIO_APK_DIR"
BIO_VARIANT="${1:-release}"
case "$BIO_VARIANT" in
 release|qa) python3 scripts/stage_reviewed.py ;;
 legacy-qa) ;;
 *) echo "Unknown build variant: $BIO_VARIANT" >&2; exit 1 ;;
esac
BIO_APK="$BIO_APK_DIR/bubei-biology-0.6.0.apk"
BIO_ASSETS="build/reviewed-assets"
if [ "$BIO_VARIANT" = "legacy-qa" ]; then BIO_ASSETS="app/assets"; fi
cp app/AndroidManifest.xml build/AndroidManifest.xml
if [ "$BIO_VARIANT" != "release" ]; then
 BIO_APK="$BIO_APK_DIR/bubei-biology-0.6.0-${BIO_VARIANT}.apk"
 python3 - <<'BIOPY'
from pathlib import Path
p=Path('build/AndroidManifest.xml')
s=p.read_text().replace('package="cn.bubei.biology"','package="cn.bubei.biology.qa"').replace('android:label="不背生物"','android:label="不背生物测试" android:debuggable="true"')
p.write_text(s)
BIOPY
fi
node --check app/assets/scheduler.js
node --check app/assets/anki-core.js
node --check app/assets/app.js
node --check app/assets/data.js
node --check app/assets/catalog.js
node --check app/assets/enhanced.js
node --check app/assets/visuals.js
node --check app/reviewed/ui.js
node --check app/reviewed/views.js
node --check app/reviewed/store.js
node --check app/reviewed/reviewed.js
"$BIO_BUILD_TOOLS/aapt2" compile --dir app/res -o build/resources.zip
"$BIO_BUILD_TOOLS/aapt2" link -I "$BIO_ANDROID_JAR" --manifest build/AndroidManifest.xml -A "$BIO_ASSETS" -o build/unsigned.apk build/resources.zip
"$BIO_JAVA_HOME/bin/javac" -source 8 -target 8 -encoding UTF-8 -classpath "$BIO_ANDROID_JAR" -d build/classes app/src/cn/bubei/biology/MainActivity.java
"$BIO_JAVA_HOME/bin/java" -cp "$BIO_BUILD_TOOLS/lib/d8.jar" com.android.tools.r8.D8 --lib "$BIO_ANDROID_JAR" --min-api 26 --output build/dex build/classes/cn/bubei/biology/*.class
python3 - <<'PY'
import zipfile
from pathlib import Path
with zipfile.ZipFile('build/unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as z:
 for p in Path('build/dex').glob('*.dex'): z.write(p,p.name)
PY
"$BIO_BUILD_TOOLS/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
if [ ! -f signing/experience.keystore ]; then
 "$BIO_JAVA_HOME/bin/keytool" -genkeypair -keystore signing/experience.keystore -storepass android -keypass android -alias experience -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Bubei Biology Experience,O=Personal Prototype,C=CN'
fi
"$BIO_JAVA_HOME/bin/java" -jar "$BIO_BUILD_TOOLS/lib/apksigner.jar" sign --ks signing/experience.keystore --ks-key-alias experience --ks-pass pass:android --key-pass pass:android --out "$BIO_APK" build/aligned.apk
"$BIO_JAVA_HOME/bin/java" -jar "$BIO_BUILD_TOOLS/lib/apksigner.jar" verify --verbose "$BIO_APK"
"$BIO_BUILD_TOOLS/aapt2" dump badging "$BIO_APK"
