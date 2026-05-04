# AKA (Anti Koala App)

---

## Android Play Store 배포 가이드

### 구조 개요

- 이 앱은 React(웹) + Capacitor로 Android 앱을 감싼 구조
- **Google Play App Signing** 활성화 상태 — Google이 최종 APK 서명 키 관리
- 개발자는 **업로드 키(keystore)** 로만 서명해서 AAB를 업로드하면 됨

---

### 1. 키스토어 정보

| 항목 | 값 |
|------|-----|
| 파일 위치 | `C:\Users\immar\keystore\antikoala` |
| Key Alias | `antikoala` |
| 비밀번호 | 별도 보관 (절대 파일/코드에 기록 금지) |

> 키스토어 파일을 분실하면 Play Console → 앱 무결성 → "업로드 키 분실 또는 손상"에서 재설정 요청 가능 (1~3일 소요)

**키스토어 경로는 workspace.xml에서도 확인 가능:**
`android/.idea/workspace.xml` → `GenerateSignedApkSettings` → `KEY_STORE_PATH`

---

### 2. keystore.properties 설정 (최초 1회 또는 PC 바뀔 때)

`android/keystore.properties` 파일을 직접 생성 (git에 올라가지 않음):

```properties
storeFile=C:\\Users\\immar\\keystore\\antikoala
storePassword=<비밀번호>
keyAlias=antikoala
keyPassword=<비밀번호>
```

이 파일은 `android/.gitignore`에 등록되어 있어 자동으로 git 제외됨.

---

### 3. AAB 빌드 방법 (2가지 중 택1)

**방법 A — Android Studio (권장, 비밀번호 UI로 입력)**
```
Build → Generate Signed Bundle / APK
→ Android App Bundle 선택 → Next
→ Key store path: C:\Users\immar\keystore\antikoala
→ Key alias: antikoala
→ 비밀번호 입력 → Next → Release → Finish
```

**방법 B — 커맨드라인 (keystore.properties 설정 완료 후)**
```bash
cd android
./gradlew bundleRelease
```

결과물: `android/app/release/app-release.aab`

---

### 4. 버전 올리기

배포 전 `android/app/build.gradle`에서 반드시 수정:

```groovy
versionCode 4       // 이전보다 반드시 +1 (Play Store 필수 조건)
versionName "1.2"   // 사용자에게 표시되는 버전
```

---

### 5. Play Store 업로드

1. [Google Play Console](https://play.google.com/console) 접속
2. AKA 앱 선택 → **프로덕션** → **출시 대시보드** → **새 버전 만들기**
3. `android/app/release/app-release.aab` 업로드
4. 출시 노트 작성 (한국어/영어) — `release_notes_v1.1.txt` 형식 참고
5. 저장 → 검토 → 출시 시작

---

### 자주 나오는 경고 (무시해도 됨)

| 경고 | 원인 | 조치 |
|------|------|------|
| "가독화 파일이 없습니다" | `minifyEnabled false` 상태라 매핑 파일 없음 | 무시하고 진행 |
| "flatDir should be avoided" | Capacitor 빌드 구조 | 무시 |

---

## Wear OS 앱 (Galaxy Watch 연동)

### 구조 개요

- `android/wear/` — Kotlin + Jetpack Compose for Wear OS 모듈
- 폰 앱 AAB에 워치 앱이 번들로 포함됨 (`wearApp project(':wear')`)
- Play Store에서 폰 앱 설치 시 페어링된 갤럭시 워치에 **자동 설치**
- 같은 Firebase 프로젝트 사용 → **동일 계정 로그인 시 데이터 실시간 공유**

### 기능

| 화면 | 내용 |
|------|------|
| 로그인 | 이메일/비밀번호 (워치에서 최초 1회, 이후 자동 로그인) |
| 술자리 목록 | 폰 앱에서 생성한 술자리 실시간 조회, 진행중 표시 |
| 기록 화면 | 왕관 다이얼로 주류 전환, +/- 버튼, 시작/종료, 주량대비% + 페이스 표시 |

> 술자리 **생성**은 폰 앱에서만 가능. 워치는 선택 및 기록만 담당.

### Firebase 설정 (local.properties)

워치 앱은 Firebase를 수동 초기화하며, 키는 `android/local.properties`에서 관리 (git 제외):

```properties
firebase.wear.apiKey=<Firebase API 키>
firebase.wear.appId=<Android 앱 ID>
firebase.wear.projectId=anti-koala
firebase.wear.storageBucket=anti-koala.firebasestorage.app
firebase.wear.senderId=<Sender ID>
```

값은 Firebase Console → 프로젝트 설정 → `google-services.json`에서 확인.

---

## Galaxy Watch 개발/테스트 (ADB 무선 연결)

### 환경 조건

- PC와 워치가 **반드시 같은 WiFi** 에 연결되어야 함
- 갤럭시 폰과 블루투스 연결 상태에서는 워치 IP가 폰 내부 네트워크(192.0.0.x)로 표시되어 연결 불가
- 아이폰 핫스팟 환경에서는 PC(172.20.10.x)와 워치 서브넷이 달라 연결 불가
- **권장**: 공용 WiFi 또는 동일 공유기에 PC·워치 모두 연결

### ADB 연결 순서 (Android 11+ 페어링 방식)

```powershell
# 1. 워치: 개발자 옵션 → 무선 디버깅 ON
#          → 새 기기 등록 → 와이파이 페어링 코드 (IP:포트 + 6자리 코드 확인)

# 2. 페어링 (최초 1회)
echo "<6자리코드>" | adb pair <IP>:<페어링포트>

# 3. 연결
adb connect <IP>:<디버깅포트>

# 4. APK 설치
adb -s <IP>:<포트> install -r android/wear/build/outputs/apk/debug/wear-debug.apk
```

### debug APK 빌드

```powershell
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat :wear:assembleDebug
# 결과물: android/wear/build/outputs/apk/debug/wear-debug.apk
```

### 주의사항

- 공용 WiFi 중 **클라이언트 격리** 설정된 곳(일부 카페 등)은 ADB 연결 차단됨
- ADB 연결은 WiFi 절전 시 끊길 수 있음 → `adb connect <IP>:<포트>` 재실행으로 복구
- Galaxy Watch 4는 `adb pair` 페어링 코드 UI가 "새 기기 등록" 하위 메뉴에 있음

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
