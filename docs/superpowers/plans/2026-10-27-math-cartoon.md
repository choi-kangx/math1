# 초등 수학 원리 탐구 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1~3학년 학생이 원리 단위 단계를 골라 만화 장면과 객관식 연습 문제를 풀며 원리를 스스로 깨닫게 하는 정적 웹앱의 엔진과 시범 2단계를 만든다.

**Architecture:** 빌드 없는 정적 HTML/CSS/JS. 순수 로직(`js/engine.js`)은 Node 내장 테스트로 검증하고, 단계 내용은 JSON 데이터(`data/steps/`)로 두어 `fetch`로 읽는다. 화면은 단계 목록(`index.html`)과 단계 진행(`step.html`) 두 페이지다.

**Tech Stack:** HTML, CSS, JavaScript(ES modules), 인라인 SVG, Node.js 내장 `node:test`, Playwright(webapp-testing 스킬)로 화면 검증.

**Spec:** `docs/superpowers/specs/2026-10-27-math-cartoon-design.md`

## Global Constraints

- 빌드 도구 없이 HTML·CSS·JavaScript 정적 파일만으로 동작한다.
- GitHub Pages에 배포한다.
- 대상은 초등 1~3학년이며, 화면 글은 한글이다.
- 단계 내용은 데이터 파일로 분리되어 있어야 한다.
- 로컬 확인은 정적 서버(`python -m http.server`)로 한다. `file://`에서는 `fetch`가 동작하지 않는다.
- 1차 범위는 엔진과 시범 2단계(묶음 세기, 받아올림이 있는 덧셈)이며, 애니메이션은 넣지 않는다.
- PC와 태블릿 모두 터치 입력이 가능해야 한다.
- 진행 상태는 `localStorage`에 저장하되, 저장이 막혀 있어도 화면은 정상 동작해야 한다.

## Review Focus

1. 선택지를 빠르게 두 번 누르면 장면이 두 번 넘어가면 안 된다. (Task 8)
2. 힌트 장면을 본 뒤 같은 문제에서 정답을 고르면 그 문제가 완료로 기록된다. (Task 8)
3. `localStorage`가 막힌 브라우저(사생활 보호 모드 등)에서도 단계 화면이 열리고 풀이가 된다. (Task 3)
4. 단계 JSON 로딩이 실패하면 빈 화면 대신 "단계를 불러오지 못했어요" 안내와 목록 링크가 나온다. (Task 8)
5. 힌트 장면 id가 존재하지 않거나 정답 번호가 보기 범위를 벗어난 단계 데이터는 검증에서 걸러진다. (Task 1)

## Plan decisions beyond the spec

- 단계 목록은 `data/steps/index.json` 매니페스트로 관리한다. 정적 서버는 폴더 목록을 줄 수 없으므로 `fetch`가 단계 목록을 알 방법이 필요하다. (Task 2)
- 만화 장면에서 틀린 선택지를 고르면 "다시 생각해 보자" 문구만 보여주고 같은 장면에서 다시 고르게 한다. 힌트 장면은 연습 문제에서만 쓴다. (Task 8)
- 연습 문제는 틀리면 `hintScene`에 적힌 장면을 보여준 뒤 같은 문제를 다시 풀게 한다. (Task 8)

---

## File Structure

- `package.json`: `"type": "module"`과 `test` 스크립트. Task 1에서 만든다.
- `js/engine.js`: 단계 데이터 검증, 정답 판정, 완료 판정. 화면과 무관한 순수 함수만 둔다.
- `js/loader.js`: `fetch`로 매니페스트와 단계 JSON을 읽는다.
- `js/progress.js`: `localStorage`에 푼 문제 id를 저장하고 읽는다. 실패하면 빈 값을 돌려준다.
- `js/index.js`: 단계 목록 화면 스크립트.
- `js/step.js`: 단계 진행 화면 스크립트.
- `index.html`, `step.html`, `css/style.css`: 화면.
- `data/steps/index.json`: 단계 목록 매니페스트.
- `data/steps/count-groups.json`, `data/steps/carry-addition.json`: 시범 2단계 내용.
- `assets/count-groups/*.svg`, `assets/carry-addition/*.svg`: 만화 장면 그림.
- `tests/engine.test.js`, `tests/loader.test.js`, `tests/progress.test.js`, `tests/content.test.js`: 단위 테스트.

---

### Task 1: 단계 데이터 검증과 정답 판정 (engine)

**Files:**
- Create: `package.json`
- Create: `js/engine.js`
- Test: `tests/engine.test.js`

**Interfaces:**
- Consumes: 없음 (첫 번째 작업)
- Produces:
  - `validateStep(step: object) -> string[]`: 문제가 없으면 빈 배열. 다음을 검사한다: `id`, `grade`(1~3), `title`, `principle`, `scenes`, `practice`가 있는지; `scenes`의 `id`와 `practice`의 `id`가 각각 고유한지; 모든 `answer`가 `choices`의 0 이상 길이 미만인지; `practice[].hintScene`이 `scenes`의 id 중 하나인지.
  - `checkChoice(item: {answer: number}, choiceIndex: number) -> boolean`
  - `isStepComplete(step: object, solvedIds: string[]) -> boolean`: `practice`의 모든 id가 `solvedIds`에 있으면 true.

- [ ] **Step 1: `package.json` 작성**

`"type": "module"`, `"scripts": { "test": "node --test tests/" }`만 둔다. 다른 의존성은 없다.

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/engine.test.js`에서 다음을 검사한다.
- 정상 단계 객체는 `validateStep`이 `[]`를 돌려준다.
- `hintScene`이 없는 scene id를 가리키면 오류 배열에 그 id가 포함된다.
- `answer`가 `choices.length`와 같거나 크면 오류가 난다.
- `practice`의 id가 중복되면 오류가 난다.
- `checkChoice({answer: 1}, 1)`은 true, `checkChoice({answer: 1}, 0)`은 false.
- `isStepComplete`는 `solvedIds`에 모든 practice id가 있을 때만 true다.

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL, `js/engine.js` 모듈을 찾을 수 없음

- [ ] **Step 4: `js/engine.js` 구현**

위 세 함수를 export한다. 외부 의존성과 DOM 접근은 쓰지 않는다.

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add package.json js/engine.js tests/engine.test.js
git commit -m "feat: add step validation and answer checking"
```

---

### Task 2: 단계 목록 매니페스트와 로더 (loader)

**Files:**
- Create: `data/steps/index.json`
- Create: `js/loader.js`
- Test: `tests/loader.test.js`

**Interfaces:**
- Consumes: `validateStep(step) -> string[]` (Task 1, `js/engine.js`)
- Produces:
  - `loadManifest(base?: string) -> Promise<string[]>`: `data/steps/index.json`을 읽어 단계 id 배열을 돌려준다. 기본 `base`는 `"data/steps/"`.
  - `loadStep(id: string, base?: string) -> Promise<object>`: `${base}${id}.json`을 읽고 `validateStep`을 통과시킨다. HTTP 실패나 검증 오류가 있으면 메시지에 id가 들어간 Error를 던진다.

- [ ] **Step 1: 매니페스트 작성**

`data/steps/index.json`: `{ "steps": ["count-groups", "carry-addition"] }`

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/loader.test.js`에서 `globalThis.fetch`를 가짜 함수로 바꿔 검사한다.
- `loadManifest()`가 `index.json`의 `steps` 배열을 돌려준다.
- 응답이 `ok: false`이면 `loadStep("x")`가 "x"를 포함한 Error를 던진다.
- 검증에 실패한 JSON이면 `loadStep`이 Error를 던진다.

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL, `js/loader.js`를 찾을 수 없음

- [ ] **Step 4: `js/loader.js` 구현**

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add data/steps/index.json js/loader.js tests/loader.test.js
git commit -m "feat: add manifest and step loader"
```

---

### Task 3: 진행 상태 저장 (progress)

**Files:**
- Create: `js/progress.js`
- Test: `tests/progress.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `loadSolved(stepId: string) -> string[]`: 저장된 푼 문제 id 배열. 저장소 접근이 throw하면 `[]`.
  - `saveSolved(stepId: string, solvedIds: string[]) -> void`: 실패해도 throw하지 않는다.
  - 저장 키: `mathcartoon:solved:${stepId}`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/progress.test.js`에서 `globalThis.localStorage`를 가짜로 바꿔 검사한다.
- 저장한 뒤 읽으면 같은 배열이 나온다.
- `localStorage.getItem`이 throw하도록 만들면 `loadSolved`는 `[]`를 돌려주고, `saveSolved`는 throw하지 않는다.
- 저장된 값이 JSON이 아니면 `loadSolved`는 `[]`를 돌려준다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL, `js/progress.js`를 찾을 수 없음

- [ ] **Step 3: `js/progress.js` 구현**

모든 저장소 접근을 `try/catch`로 감싼다.

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add js/progress.js tests/progress.test.js
git commit -m "feat: add progress storage with fallback"
```

---

### Task 4: 시범 단계 내용 - 묶음 세기 (content)

**Files:**
- Create: `data/steps/count-groups.json`
- Test: `tests/content.test.js`

**Interfaces:**
- Consumes: `validateStep(step) -> string[]` (Task 1)
- Produces: 단계 객체. 장면 이미지 경로는 `assets/count-groups/<scene-id>.svg`이고 그림은 Task 6에서 만든다.

단계 JSON 형식:
- 최상위: `id`, `grade`, `area`, `title`, `principle`, `scenes`, `practice`
- `scenes[]`: `id`, `image`, `dialogue`(캐릭터 대사), `question`, `choices`(문자열 배열), `answer`(정답 인덱스)
- `practice[]`: `id`, `prompt`, `choices`, `answer`, `hintScene`(`scenes`의 id)

내용 기준: 장면은 4개 이내이고 마지막 장면은 "10개씩 묶으면 몇 개일까?"처럼 원리를 스스로 떠올리게 하는 질문으로 끝낸다. 장면 대사는 답을 직접 말하지 않는다. 연습 문제는 6문제 이내이고, 쉬운 것부터 나열한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/content.test.js`에서 `data/steps/index.json`에 적힌 각 단계 파일을 읽어 `validateStep`이 `[]`를 돌려주는지 검사한다. 이 시점에는 `count-groups`만 있으므로 이 항목이 실패한다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL, `count-groups.json`을 찾을 수 없음

- [ ] **Step 3: `data/steps/count-groups.json` 작성**

위 형식과 내용 기준을 따른다. 장면 대사와 질문은 한글로 쓴다.

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add data/steps/count-groups.json tests/content.test.js
git commit -m "feat: add count-groups sample step"
```

---

### Task 5: 시범 단계 내용 - 받아올림이 있는 덧셈 (content)

**Files:**
- Create: `data/steps/carry-addition.json`
- Modify: `tests/content.test.js` (변경 없음, 매니페스트 기준으로 자동 포함됨)

**Interfaces:**
- Consumes: `validateStep` (Task 1), Task 4의 단계 형식
- Produces: 단계 객체. 장면 이미지 경로는 `assets/carry-addition/<scene-id>.svg`.

내용 기준: 원리는 "10을 만들어 계산한다"이다. 장면은 9+5처럼 받아올림이 생기는 예에서 시작해, 한 수를 쪼개 10을 만드는 과정을 캐릭터의 질문으로 따라가게 한다. Task 4와 같은 기준을 따른다.

- [ ] **Step 1: 매니페스트에 단계 추가 확인**

`data/steps/index.json`에 `carry-addition`이 있는지 확인한다. 이미 Task 2에서 넣었으므로 이 단계는 확인만 한다.

- [ ] **Step 2: 실패하는 테스트 확인**

Run: `npm test`
Expected: FAIL, `carry-addition.json`을 찾을 수 없음

- [ ] **Step 3: `data/steps/carry-addition.json` 작성**

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add data/steps/carry-addition.json
git commit -m "feat: add carry-addition sample step"
```

---

### Task 6: 만화 장면 그림 (SVG)

**Files:**
- Create: `assets/count-groups/*.svg` (장면마다 한 파일)
- Create: `assets/carry-addition/*.svg` (장면마다 한 파일)
- Create: `assets/count-groups/hint-*.svg`, `assets/carry-addition/hint-*.svg` (힌트 장면이 쓰는 그림이 있으면 같이)
- Test: `tests/content.test.js` (이미지 파일 존재 검사 추가)

**Interfaces:**
- Consumes: Task 4, Task 5의 `scenes[].image` 경로
- Produces: 각 장면의 SVG 파일. 가로세로 비율은 4:3, `viewBox`를 설정한다. 애니메이션은 넣지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/content.test.js`에 다음 검사를 추가한다. 각 단계의 모든 `scenes[].image`와 `practice[].hintScene`이 가리키는 장면의 `image` 파일이 존재하고, 내용이 `<svg`로 시작해야 한다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test`
Expected: FAIL, 이미지 파일 없음

- [ ] **Step 3: SVG 파일 작성**

각 장면은 캐릭터 하나와 묶음 또는 10 모형을 그린다. 글자는 SVG `<text>`로 넣지 않고, 대사는 HTML에서 표시한다.

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add assets tests/content.test.js
git commit -m "feat: add scene illustrations for sample steps"
```

---

### Task 7: 단계 목록 화면 (index)

**Files:**
- Create: `index.html`
- Create: `js/index.js`
- Create: `css/style.css` (목록 스타일만)

**Interfaces:**
- Consumes: `loadManifest()` (Task 2), `loadStep(id)` (Task 2), `loadSolved(stepId)` (Task 3)
- Produces: 단계 카드 목록. 각 카드는 `step.html?id=<id>` 링크이고 학년, 단계 이름, 원리 한 줄, 완료 여부를 보여준다.

- [ ] **Step 1: 화면 작성**

`index.html`은 `<!doctype html>`, `lang="ko"`, viewport 메타를 가진다. `js/index.js`를 `type="module"`로 불러온다. 목록 로딩에 실패하면 "단계 목록을 불러오지 못했어요"를 보여준다.

- [ ] **Step 2: 실행 확인**

Run: `python -m http.server 8000` (프로젝트 폴더에서 실행)
Expected: `http://localhost:8000/`에서 단계 카드 2개가 보인다.

- [ ] **Step 3: 커밋**

```bash
git add index.html js/index.js css/style.css
git commit -m "feat: add step list page"
```

---

### Task 8: 단계 진행 화면 (step)

**Files:**
- Create: `step.html`
- Create: `js/step.js`
- Modify: `css/style.css` (장면과 문제 스타일, 태블릿 터치 크기)

**Interfaces:**
- Consumes: `loadStep(id)` (Task 2), `validateStep`과 `checkChoice`, `isStepComplete` (Task 1), `loadSolved`, `saveSolved` (Task 3)
- Produces: 화면 흐름
  1. 장면 1 → 장면 N: 장면 그림, 대사, 질문, 보기. 맞는 보기를 누르면 다음 장면. 틀린 보기는 "다시 생각해 보자" 문구만 보여주고 같은 장면에 머문다.
  2. 연습 문제: 보기를 고른다. 맞으면 해당 id를 `saveSolved`로 기록하고 다음 문제. 틀리면 `hintScene`의 그림과 대사를 보여준 뒤 같은 문제를 다시 풀게 한다.
  3. 모든 문제를 맞히면 완료 화면과 목록 링크를 보여준다.
  - 단계 id는 `step.html?id=<id>` 쿼리에서 읽는다. 로딩 실패 시 Task 8의 Review Focus 4번 문구를 보여준다.

- [ ] **Step 1: 화면 골격 작성**

`step.html`은 `index.html`과 같은 메타와 `css/style.css`를 쓴다. 보기 버튼 높이는 최소 48px이다.

- [ ] **Step 2: 실행 확인**

Run: `python -m http.server 8000`
Expected: `http://localhost:8000/step.html?id=count-groups`에서 첫 장면이 보인다.

- [ ] **Step 3: 연타 방지 처리**

보기 버튼을 누르면 장면 전환이 끝날 때까지 다음 입력을 무시한다. 같은 버튼을 두 번 눌러도 다음 장면은 한 번만 넘어가야 한다.

- [ ] **Step 4: 화면 흐름 검증 (webapp-testing 스킬, Playwright)**

Playwright로 다음을 확인한다.
- `count-groups`를 처음부터 끝까지 풀면 완료 화면이 나온다. (Review Focus 2번)
- 같은 보기를 빠르게 두 번 누르면 장면이 두 번 넘어가지 않는다. (Review Focus 1번)
- 잘못된 id(`step.html?id=nope`)로 열면 "단계를 불러오지 못했어요"와 목록 링크가 보인다. (Review Focus 4번)

Expected: 세 항목 모두 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add step.html js/step.js css/style.css
git commit -m "feat: add step flow page with hints and completion"
```

---

## Self-Review

- **Spec coverage:** 단계 선택(Task 7), 장면 선택지(Task 8 흐름 1), 객관식과 힌트 후 재도전(Task 8 흐름 2), 전부 맞혀야 완료(Task 8 흐름 3), 데이터 분리(Task 1, 2, 4, 5), GitHub Pages와 정적 서버 확인(Global Constraints, Task 7 Step 2), 1차 범위(Task 4, 5), 애니메이션 없음(Task 6), 터치 크기(Task 8 Step 1), localStorage 실패 대응(Task 3). 누락 없음.
- **Type consistency:** `validateStep`, `checkChoice`, `isStepComplete`, `loadManifest`, `loadStep`, `loadSolved`, `saveSolved` 이름이 Interfaces 블록과 일치한다.
- **Review Focus:** 다섯 항목 모두 소유 Task의 테스트 또는 검증 단계에 있다.
- **Proportion:** 코드 블록은 최소로 두었고, 함수 본문과 세부 스타일은 구현자가 정한다.

**Caveats:** 시범 단계의 교육과정 배치(묶음 세기 1학년, 받아올림 덧셈 2학년)는 교과서 목차와 아직 대조하지 않았다. 설계 문서에 적힌 대로 "미확인"이다.
