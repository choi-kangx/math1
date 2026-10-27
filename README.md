# 수학 놀이터 (math1)

초등 1~6학년이 만화와 게임으로 수학 원리를 익히는 정적 웹앱입니다. GitHub Pages에 그대로 올릴 수 있습니다.

## 기능

- **오늘의 미션**: 학년에 맞는 게임 3개가 매일 바뀝니다. 별 1개 이상이면 완료되고 미션마다 코인 보너스를 줍니다.
- **만화로 배우기**: 이야기 속 질문에 답하며 원리를 스스로 찾는 레슨 8개(1~5학년). 틀리면 힌트 장면을 보고 다시 풉니다.
- **연습 게임 24종**: 게임마다 쉬움·보통·어려움 3단계(덧셈·뺄셈은 세 자리 수까지 5단계)가 있고, 학년에 맞는 단계를 추천합니다. 별 2개 이상이면 다음 단계에 도전할 수 있습니다.
  - 1~2학년: 수 세기(묶음과 낱개), 크기 비교(식끼리), 덧셈·뺄셈(한 자리~세 자리), 수 만들기, 도형(대각선), 받아올림·받아내림(세 자리), 곱셈구구(□ 찾기), 규칙 찾기, 시계(1분 단위, 몇 분 후)
  - 3학년: 나눗셈(나머지), 곱셈(두 자리 × 두 자리), 분수, 문장제(두 번 계산), 큰 수 덧셈·뺄셈
  - 4학년: 혼합 계산, 큰 수의 곱셈·나눗셈, 둘레와 넓이
  - 5학년: 약수와 배수, 분수의 계산(분모가 다른 덧셈), 소수의 계산
  - 6학년: 비와 비율(백분율, 비례식, 할인), □ 구하기
- **보상**: 별(최고 기록), 코인, 연속 학습 일수, 코인으로 모으는 스티커북.
- **설정**: 이름, 학년(1~6), 효과음, 문제 읽어 주기(한국어 음성), 기록 초기화.

진행 기록은 브라우저 `localStorage`에만 저장되며, 저장이 막혀 있어도 앱은 동작합니다.

## 로컬에서 실행

`index.html`을 더블클릭(`file://`)하면 브라우저 보안 규칙 때문에 앱이 실행되지 않습니다. 대신 아래 방법으로 엽니다.

- **Windows**: 폴더의 `start.bat`을 더블클릭하면 서버가 켜지고 브라우저가 열립니다. Python이 필요합니다. 끌 때는 최소화된 `math-playground-server` 창을 닫습니다.
- **직접 실행**: 프로젝트 폴더에서 아래 명령을 실행하고 브라우저로 접속합니다.

```bash
python -m http.server 8000
# http://localhost:8000
```

## 테스트

```bash
npm test
```

## 레슨 추가

`data/steps/<id>.json`을 만들고 `data/steps/index.json`의 `steps`에 id를 넣습니다. 형식은 `js/engine.js`의 `validateStep`이 검사합니다.

장면 그림은 `art`로 적으면 `js/comic.js`가 같은 화풍으로 그려 줍니다.

```json
"art": {
  "bg": "room",
  "title": "바구니에는 10개가 들어가요",
  "cast": [{ "who": "owl", "side": "left", "mood": "think" }],
  "groups": [
    { "obj": "apple", "n": 9, "holder": "basket", "cols": 5 },
    { "sep": "+" },
    { "obj": "apple", "n": 5, "holder": "plate" }
  ]
}
```

- 배경 `bg`: `room`, `park`, `class`
- 인물 `who`: `owl`, `girl`, `boy`, `kid`, `kid2` / 표정 `mood`: `happy`, `think`, `wow`
- 물건 `obj`: `marble`, `candy`, `cookie`, `strawberry`, `apple`, `donut`, `ladybug`, `choco`
- 담는 것 `holder`: `plate`, `basket`, `bowl`, `box`, `leaf`, `string`(10개 꿰기), `scatter`(흩어 놓기), `none`
- 그 밖의 묶음: `{ "stack": [...] }`(세로), `{ "row": [...] }`(가로), `{ "people": 3, "each": 4, "obj": "donut" }`, `{ "pizza": 8, "filled": 3, "filled2": 2 }`, `{ "bar": 10, "filled": 4 }`, `{ "tokens": ["1", "2"] }`, `{ "vehicle": "bus" }`, 그리고 어느 묶음에나 `"label"`

글꼴은 Pretendard(jsDelivr CDN)를 쓰며, 불러오지 못하면 시스템 글꼴로 보입니다.
