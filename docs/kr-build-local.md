# 홈드로이드 KR — 이 저장소에서 직접 빌드하기

`homedroid-kr` 브랜치의 코드를 arm64-v8a APK로 만드는 방법입니다. Pickle의 GitHub 연결에는
워크플로 쓰기 권한이 없어 GitHub Actions를 쓸 수 없었고, 그래서 0.9.4-kr.1은 작업 환경에서
직접 빌드했습니다. 워크플로 원본은 `docs/kr-build-workflow.yml`에 있습니다(Actions 권한이
생기면 `.github/workflows/build.yml`로 옮기면 됩니다).

## 필요한 것

- JDK 21, Android SDK(platform 36, build-tools 36.0.0), NDK 30.0.16248370, Go 1.26+
- 호스트 도구: GNU make, patch, awk(gawk 권장), xz, readelf, `git`, `curl`

## 1. 네이티브 데몬 (jniLibs)

```sh
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/30.0.16248370
native/build.sh arm64-v8a          # sshd, caddy, cloudflared, tailscaled (Go + cgo)
native/build-proot.sh arm64-v8a    # proot + talloc
native/build-ffmpeg.sh arm64-v8a   # libffmpeg.so (MediaCodec)
```

`build-proot.sh`의 talloc 단계는 waf configure가 오래 걸립니다. 시간 제한이 있는 환경에서는
`talloc.c`를 직접 컴파일해 `native/.work/sysroot-arm64-v8a/lib/libtalloc.a`와
`include/talloc.h`를 만들어 두면 그 단계를 건너뜁니다(`-D__STDC_WANT_LIB_EXT1__=1` 필요).

호스트 C 컴파일러가 없는 환경에서 ffmpeg을 빌드할 때는:

- `configure`에 `--host-cc=<항상 성공하는 스텁>`을 주고(교차 빌드라 호스트 컴파일러는 C11
  지원 여부 확인에만 쓰입니다),
- `--disable-asm`을 줍니다(그러지 않으면 `libswscale/aarch64/ops_asmgen` 같은 **호스트** 도구를
  빌드해야 하는데 호스트 컴파일러가 없습니다). `--disable-unstable`은 쓰면 안 됩니다 —
  `ff_sws_chroma_pos`가 그 안에 있어 링크가 깨집니다.
- `ffbuild/bin2c`는 3~4개 인자(`<입력> <출력> [이름]`)를 받는 스크립트로 대체할 수 있습니다
  (`const unsigned char ff_<이름>_data[] = {...};` 형식).

## 2. APK (서명 없이 만들고 따로 서명)

```sh
./gradlew --no-daemon assembleRelease -PhomedroidUnsigned=true
# 결과: app/build/outputs/apk/release/app-<abi>-release-unsigned.apk

$ANDROID_HOME/build-tools/36.0.0/zipalign -p -f 4 app-arm64-v8a-release-unsigned.apk aligned.apk
$ANDROID_HOME/build-tools/36.0.0/apksigner sign \
  --ks .kr/signing/gene-homedroid-kr.p12 --ks-type PKCS12 --ks-key-alias gene-homedroid \
  --ks-pass 'pass:<암호>' --key-pass 'pass:<암호>' --min-sdk-version 29 \
  --out homedroid-0.9.4-kr.1-arm64-v8a.apk aligned.apk
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs homedroid-0.9.4-kr.1-arm64-v8a.apk
```

서명 키(`.kr/signing/gene-homedroid-kr.p12`)와 암호는 저장소에 올리지 않습니다. 잃으면 새
빌드로 기존 설치를 덮어쓸 수 없습니다.

## 3. 배포

```sh
gh release create v0.9.4-kr.1 <apk> SHA256SUMS -R gene4517-bot/ai-office \
  --title "홈드로이드 KR 0.9.4-kr.1 (gene 홈서버)" --notes-file docs/releases/v0.9.4-kr.1.md \
  --target homedroid-kr
```

앱은 `https://github.com/gene4517-bot/ai-office/releases`를 보고 업데이트하며, 태그에서 `v`를 뺀
값이 `versionName`과 같아야 휴대폰 AI 런타임을 내려받습니다.
