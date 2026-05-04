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
