# ZENA (디스코드 음악 봇)

Discord.js v14 + Shoukaku v4 + Lavalink v4 기반의 음악 봇입니다.  
**라이선스:** 비상업적 사용만 가능, 수정본 배포 금지, 원작자 salmoon_77 표기 필수 — `LICENSE` 참고

---

## 주요 기능

- 디스코드 **슬래시 명령어** 지원(봇 시작 시 자동 등록)
- **Lavalink** 기반 음악 재생(재생/일시정지/스킵/반복/중지 등 — 구현한 명령어에 따라 다름)
- 간단한 **대기열/플레이어 관리** (`src/music/manager.js`)
- Shoukaku 이벤트 및 프로세스 에러에 대한 **안전망**

---

## 보안 주의사항

- `.env` 파일에 **비밀값(토큰/DB URL 등)** 을 넣고, 저장소에 절대 커밋하지 마세요.
- 유출되었다면 즉시 **회수/재발급(rotate)** 하세요.
  - Discord: Developer Portal → Bot → **Reset Token**
  - MongoDB Atlas: 사용자 비밀번호 변경 또는 사용자 재생성
- `.gitignore` 예시:
```gitignore
.env
```

---

## 사전 준비물

- **Node.js**: v20 이상 권장
- **Java**: 17 이상(예: Temurin 17/21) — **Lavalink v4** 실행
- **Git**
- **Discord 애플리케이션 & 봇** (OAuth2 스코프: `bot`, `applications.commands`)
- **필수 권한**: Connect, Speak, Send Messages, Embed Links, Use Slash Commands

---

## 디스코드 봇 생성/초대

1. Discord Developer Portal → 애플리케이션 생성
2. **Bot** 탭에서 봇 생성, **토큰** 발급
3. **OAuth2 → URL Generator**
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: Connect, Speak, Send Messages, Embed Links
   - 생성된 URL로 서버에 초대
4. **Application(Client) ID**, **Guild(서버) ID** 복사

---

## 설치

```bash
# 저장소 클론
git clone https://github.com/Salmoon77/ZENA-Discord-Music-Bot.git
cd muse

# 패키지 설치
npm i
```

---

## 환경 변수 설정 (`.env`)

프로젝트 루트에 `.env` 파일을 만들고 값을 채웁니다.  
> 현재 `src/index.js`에서 `TOKEN`과 `DISCORD_TOKEN`을 모두 사용하므로 **두 값에 동일한 봇 토큰**을 넣으세요.

```env
# 디스코드 봇
TOKEN=YOUR_DISCORD_BOT_TOKEN
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
DISCORD_CLIENT_ID=YOUR_DISCORD_APPLICATION_CLIENT_ID
GUILD_ID=YOUR_GUILD_ID

# Lavalink
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false

# MongoDB (선택 — 사용하는 명령어가 있을 때만 필요)
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
```

---

## Lavalink 설정 (`application.yml`)

Lavalink 실행 폴더에 `application.yml` 파일을 만들고 아래 내용을 그대로 넣습니다(YouTube 플러그인 사용 예시).  
`password`는 `.env`의 `LAVALINK_PASSWORD`와 동일해야 합니다.

```yaml
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  server:
    password: "youshallnotpass"   # 봇 쪽과 맞추기
    sources:
      youtube: false         # 기본 내장 소스 끄기 (plugin만 사용)
      soundcloud: false
      bandcamp: false
      vimeo: false
      twitch: false
      http: false
      local: false

  plugins:
    - dependency: "dev.lavalink.youtube:youtube-plugin:1.13.5"
      repository: "https://maven.lavalink.dev/releases"

logging:
  level:
    root: INFO
    lavalink: INFO
    dev.lavalink.youtube: DEBUG   # 쿠키/클라이언트 관련 로그 자세히 확인 가능

plugins:
  youtube:
    enabled: true
    allowSearch: true
    allowDirectVideoIds: true
    allowDirectPlaylistIds: true

    # 쿠키 인증
    cookiePath: "./cookies.txt"

    # 권장 클라이언트(안정적)
    clients:
      - WEB
      - MWEB
      - WEBEMBEDDED
      - MUSIC

    # 문제성 클라이언트 차단
    clientOptions:
      ANDROID: { playback: false, videoLoading: false, searching: false }
      ANDROID_MUSIC: { playback: false, videoLoading: false, searching: false }
      ANDROID_VR: { playback: false, videoLoading: false, searching: false }
      TV: { playback: false }
      TVHTML5EMBEDDED: { playback: false }

# 선택: 라우트 플래너 (IP 회전이 필요할 경우)
# ipRotator:
#   blockSources: [ "youtube.com", "googlevideo.com" ]
#   strategy: "LoadBalance"
```

Lavalink 실행:
```bash
java -jar Lavalink.jar
```

---

## 실행

Lavalink를 먼저 실행한 뒤, 새 터미널에서 봇을 실행합니다.

```bash
node src/index.js
```

정상 출력 예시:
```
✅ Logged in as <봇이름>#1234
⏳ Registering slash commands...
✅ Slash commands registered!
[Shoukaku] node=main ready (resumed=false)
```

---

## 문제 해결

- **401 Unauthorized (Shoukaku)**: Lavalink 비밀번호/호스트/포트/보안(ws/wss) 불일치 여부 확인
- **노드 없음**: Lavalink 가동 상태/방화벽/포트 개방 확인
- **슬래시 명령어 미표시**: `GUILD_ID`, 초대 스코프(`applications.commands`), “Slash commands registered!” 로그 확인
- **소리 안 남**: 소스 매니저 설정, 채널 권한(Speak), 서버 음소거/권한 확인, 검색 쿼리 형식(URL 또는 `ytsearch:`)

---

## 라이선스

- **상업적 사용 금지**
- **코드 수정 가능**, 단 **수정본(2차 저작물) 배포 불가**
- **원작자 표기 필수**: `salmoon_77`
- 전문은 `LICENSE` 파일을 참조하세요.

---

## 기여

원본 저장소에 대한 PR(버그 수정, 문서 개선 등)은 환영합니다.  
단, 수정본의 **외부 재배포는 금지**됩니다.

---

## 문의

이슈 등록 시 로그와 환경(Node.js/Java 버전), 재현 절차를 함께 남겨주세요.
또는, 디스코드 서버에서 문의를 남겨주세요.
https://discord.gg/RfGwkc6tAE

