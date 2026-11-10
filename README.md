# 방구석 오락실

한 프로젝트에서 여러 게임을 실행하는 Vite + Phaser 게임 모음입니다.

플레이 주소: https://wyna3209.github.io/mini-game-arcade/

## 실행

```sh
npm install
npm run dev
```

터미널에 표시되는 주소를 열면 게임 선택 화면이 나옵니다. 일반적인 주소는 `http://127.0.0.1:5173/`입니다.
`npm test`로 게임 규칙을 검사하고 `npm run build`로 전체 게임을 `dist`에 빌드합니다.
패드 세로 화면에서는 시계와 주문 시각이 크게 배치됩니다. 바늘 끝을 터치해 드래그하면 손가락 움직임을 따라 회전하며, 캐릭터 선택과 시계 바늘의 터치 영역도 넓혔습니다.

## 폴더

```text
index.html                  게임 선택 화면
hub/                        선택 화면 스타일
games/
  find-snack/               친구 추적 게임 모음
    index.html              떡 먹은 용만이 찾기
    snorunt.html            열매 먹은 눈꼬마 찾기
    src/                    두 버전의 공통 게임 코드
    test/                   규칙 검사
    README.md               게임 설명
  clock-repair/             부우부와 기어르의 시계 수리점
    index.html
    src/
    test/
vite.config.js              모든 게임 HTML을 자동으로 빌드
```

## 게임 주소

- `/games/find-snack/`: 떡 먹은 용만이 찾기
- `/games/find-snack/snorunt.html`: 열매 먹은 눈꼬마 찾기
- `/games/clock-repair/`: 부우부와 기어르의 시계 수리점

새 게임은 `games/게임이름/`에 `index.html`과 코드를 만들고 루트 `index.html`에 게임 카드를 추가합니다.
HTML은 Vite 설정에서 자동으로 수집하므로 빌드 설정을 따로 추가하지 않아도 됩니다.
게임의 이미지·스타일·코드는 해당 게임 폴더 안에 두고 상대 경로로 연결합니다.

## 배포

`main` 브랜치에 푸시하면 GitHub Actions가 테스트와 Vite 빌드를 실행하고 `dist`를 GitHub Pages에 배포합니다. Vite의 상대 경로 설정을 사용해 저장소 하위 주소에서도 세 게임의 에셋을 불러옵니다.
