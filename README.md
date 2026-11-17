# 🎄 도파# 크리스마스 오락실

여러 명이 같이 돌아다니는 3D 크리스마스 오락실. 인형뽑기는 [claw-machine](https://github.com/dopasharp/claw-machine)의 기계·집게·인형 물리를 그대로 가져왔어요.

👉 https://dopasharp.github.io/christmas-arcade/

- **폰 하나로**: 화면 왼쪽 아래 조이스틱으로 걷고, 오른쪽 버튼으로 플레이.
- **PC**: `WASD` 이동 · `E` 플레이 · `Q` 인사 · `Esc` 나가기 · `V` 집게 시점.
- **PC + 폰 조종기**: PC 오른쪽 아래 **폰으로 조종**을 누르고 QR을 스캔하면 폰이 조이스틱이 돼요 (`pad.html`).

## 지금 들어 있는 것

| | 오락기 | 상품 |
|---|---|---|
| 🧸 | 인형뽑기 | 뽑은 인형 (산타 모자·목도리·리본 랜덤) + 🎟️3 · 코인 1번 = 🎟️1 · 다른 사람은 집게 움직임을 구경 |
| ⏱️ | 10초 맞추기 | **누구나 상품**: ±0.03초 ⭐황금 별+🎟️10 · ±0.1 🦌루돌프 인형+🎟️5 · ±0.3 🎁선물상자+🎟️2 · ±0.6 🔔황금 종+🎟️1 · ±1 🍪진저쿠키 · 그 밖 🍭사탕지팡이 |
| 🎡 | 행운 룰렛 | **꽝 없음**: 🍭 🧦 🍪 🔔 🔮 🎁 ⭐ (칸에 따라 🎟️ 덤) · 다른 사람 화면에서도 같이 돌아감 |
| 🏀 🎯 🎁 | 농구 · 핀볼 · 선물 교환소 | 모델만 (COMING SOON) |

- 인형: 곰돌이·토끼·병아리·개구리·돼지·고양이·강아지 + 크리스마스 한정 ⛄눈사람·🐧펭귄·🦌루돌프, 레어 💚도파# 인형.
- 받은 상품은 오른쪽 위 🎁 **가방**에 쌓이고, **최근 12개는 내 캐릭터에 주렁주렁** 달려서 다른 사람에게도 보여요.
- 기계 하나에 한 명. 누가 하고 있으면 `E`로 **줄 서기** → 캐릭터가 기계 앞에 순서대로 서요.
- 내 차례가 오면 10초 안에 `E`. 안 누르면 다음 사람에게 넘어가요.
- 하는 사람의 연결이 15초 넘게 끊기면 자리가 비어요. 줄 선 사람이 있는데 20초 동안 아무것도 안 하면 자동으로 비켜 줘요.
- 🎟️ 티켓과 🎁 상품은 **재미용**이에요. 기기마다(localStorage) 따로 저장되고 티켓은 매일 최소 10장으로 충전돼요. 서버 검증이 없어서 조작할 수 있으니 실제 경품·순위에 쓰지 마세요.

## Firebase 설정

프로젝트 `christmas-arcade`의 웹 설정은 [`js/firebase-config.js`](js/firebase-config.js)에 들어 있어요. 콘솔에서 아래만 확인하면 돼요.

1. 빌드 → **Authentication** → 로그인 방법 → **익명** 사용 설정.
2. Authentication → 설정 → **승인된 도메인**에 `dopasharp.github.io` 추가.
3. **Realtime Database** → **규칙** 탭에 [`database.rules.json`](database.rules.json) 내용을 붙여넣고 **게시**.
4. GitHub 저장소 → Settings → **Pages** → Source: `Deploy from a branch`, Branch: `main` / `(root)`.

> 웹 설정값(apiKey 등)은 공개돼도 되는 값이에요. 보안은 익명 로그인 + DB 규칙으로 지켜요. Firestore·Cloud Functions는 안 써요 (무료 Spark 요금제로 충분).

주소에 `?local`을 붙이면 Firebase 없이 **로컬 테스트 모드**(같은 브라우저의 탭끼리만 연동)로 돌아가요.

## 로컬 실행

```bash
python -m http.server 4180
```

http://localhost:4180/?local 을 탭 두 개로 열면 두 캐릭터가 같은 오락실에 있어요.

## 파일 구조

```
index.html            오락실 (입장 화면 · HUD · 터치 조작)
pad.html              폰 조종기 (PC 화면의 QR로 들어옴)
css/arcade.css        스타일
js/main.js            장면 · 캐릭터 이동/충돌 · 카메라 · 멀티플레이 · 대기열 · 티켓
js/world.js           맵 (바닥·벽·트리·장식·눈) · 오락기 모델 · 충돌 상자 · 기계 자리(MACHINES)
js/claw.js            인형뽑기 기계 모듈 (claw-machine/js/machine.js 에서 옮김)
js/plush.js           인형 11종 + 크리스마스 액세서리 + 장식 상품 7종, 캐릭터에 다는 작은 상품
js/avatar.js          캐릭터 (옷 6종 · 걷기/인사 애니메이션 · 닉네임 표시)
js/minigames.js       10초 맞추기 · 행운 룰렛 (모두 상품)
js/net.js             Firebase 익명 로그인 + RTDB / 로컬(BroadcastChannel) 연동
js/sound.js           효과음 (claw-machine 과 같음)
js/firebase-config.js Firebase 설정
database.rules.json   Realtime Database 보안 규칙
dopasharp/            도파# 공통 브랜드 프레임 (원본: soju-game/dopasharp/)
```

### 연동 데이터 (`arcade/xmas`)

| 경로 | 쓰는 사람 | 내용 |
| --- | --- | --- |
| `players/{uid}` | 본인만 | 닉네임·옷·위치·방향·상태·달고 있는 상품(`p`). 움직일 때 최대 10회/초, 가만히 있으면 3초마다. 끊기면 삭제 |
| `machines/{id}/player` | 트랜잭션 | 지금 하는 사람 `{uid, n, beat}`. 3초마다 beat, 15초 멈추면 비어 있는 걸로 봄 |
| `machines/{id}/queue/{uid}` | 본인만 | 줄 선 순서 `{n, at}` |
| `machines/{id}/live` | 하는 사람만 | 구경용 화면 상태 (집게 위치, 룰렛 각도, 10초 화면) |
| `pads/{코드}` | PC/폰 | QR 조종기: `owner`(PC) · `pad`(폰 접속) · `in`(조이스틱/버튼) · `ui`(버튼 글자) |

## 다음 단계

- 허브(`games.js`)에 한 줄 추가해서 공개 (Firebase 설정 후)
- 농구 · 핀볼 플레이
- 가방에서 달고 다닐 상품 고르기
- 선물 교환소: 티켓 → 꾸미기 아이템 (서버 검증이 필요하면 Cloud Functions, Blaze 요금제 필요)
- 12/1~12/24 날짜별 이벤트 (트리 장식 하나씩, 매일 보너스 티켓)
