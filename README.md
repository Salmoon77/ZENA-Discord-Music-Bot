# 🎵 ZENA (디스코드 음악 봇) — Shoukaku v4 & Lavalink 기반

> Discord.js v14와 Shoukaku v4, Lavalink v4를 이용해 제작된 디스코드 음악 봇
> **라이선스:** 비상업적 사용만 가능, 수정본 배포 금지, 원작자 표기 필수 — `LICENSE` 참조

---

## ✨ 주요 기능

* 디스코드 슬래시 명령어 지원 (봇 시작 시 자동 등록)
* Lavalink 기반 음악 재생 (재생, 일시정지, 스킵, 반복, 중지 등)
* 간단한 대기열/플레이어 관리 (`src/music/manager.js`)
* Shoukaku 이벤트/프로세스 에러 처리 안전망
* 모듈화된 구조 (`src/index.js`, `src/music/*`, `src/lib/*`, `src/config/*`)

---

## ⚠️ 보안 주의사항

* **절대 비밀값(.env)을 깃허브 등 공개 저장소에 올리지 마세요.**
* 토큰이나 DB URL이 유출되면 **즉시 재발급/회수** 하세요:

  * Discord: Developer Portal → Bot → Reset Token
  * MongoDB Atlas: 비밀번호 변경 또는 사용자 재생성
* `.gitignore`에 `.env` 추가:

  ```gitignore
  .env
  ```

---

## ✅ 사전 준비물

* **Node.js**: v20 이상 권장
* **Java**: 17 이상 (예: Temurin 17/21) — Lavalink 실행용
* **Git**
* **Discord 애플리케이션 & 봇** (OAuth2 스코프: `bot`, `applications.commands`)
* **필수 봇 권한**: Connect, Speak, Send Messages, Embed Links, Use Slash Commands

---

## 🔧 디스코드 봇 생성 및 설정

1. [Discord Developer Portal](https://discord.com/developers/applications) → 애플리케이션 생성
2. **Bot** 탭에서 봇 계정 생성
3. **Bot Token** 발급 후 `.env`에 저장
4. **OAuth2 → URL Generator**

   * Scopes: `bot`, `applications.commands`
   * 권한: Connect, Speak, Send Messages, Embed Links
   * URL로 서버에 봇 초대
5. **Application(Client) ID** 복사
6. **Server(Guild) ID** 복사 (개발자 모드 → 서버 우클릭 → ID 복사)

---

## 📦 설치 방법

```bash
# 1) 저장소 클론
git clone <repo-url> muse
cd muse

# 2) 패키지 설치
npm i
```

필요 패키지:

```bash
npm i discord.js dotenv shoukaku
```

---

## 🔐 환경변수 설정 (`.env`)

프로젝트 루트에 `.env` 파일 생성:

```env
# 디스코드 봇
TOKEN=봇_토큰
DISCORD_TOKEN=봇_토큰
DISCORD_CLIENT_ID=애플리케이션_ID
GUILD_ID=서버_ID

# Lavalink
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=helloworld
LAVALINK_SECURE=false

# MongoDB (선택)
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
```

> 현재 코드(`src/index.js`)는 `TOKEN`과 `DISCORD_TOKEN`을 동시에 사용하므로 **두 변수에 동일한 토큰**을 넣으세요. (추후 하나로 통일 가능)

---

## 🎼 Lavalink v4 설정

1. [Lavalink v4 다운로드](https://github.com/freyacodes/Lavalink/releases)
2. Jar 파일 옆에 `application.yml` 생성:

   ```yaml
   server:
     port: 2333
   lavalink:
     server:
       password: "helloworld"
       sources:
         youtube: true
         bandcamp: true
         soundcloud: true
         http: true
         local: false
   logging:
     file:
       path: ./logs/
   ```
3. 실행:

   ```bash
   java -jar Lavalink.jar
   ```

---

## ▶️ 봇 실행하기

1. 먼저 Lavalink 실행
2. 다른 터미널에서 봇 실행:

   ```bash
   node src/index.js
   ```

실행 로그 예시:

```
✅ Logged in as Muse#1234
⏳ Registering slash commands...
✅ Slash commands registered!
[Shoukaku] node=main ready (resumed=false)
```

---

## 🔒 라이선스

* **상업적 사용 금지**
* **코드 수정 가능**, 단 **수정본 배포 금지**
* **원작자 표기 필수**: salmoon\_77
* 자세한 내용은 [`LICENSE`](LICENSE) 참조

---

## 🤝 기여

* 버그 수정, 문서 개선 등 PR 환영
* 단, 수정본의 외부 배포는 금지

---

## 📫 문의

* 실행 오류 시 로그와 환경(Node, Java 버전 등)을 첨부해 이슈 등록

---

