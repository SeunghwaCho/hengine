# 별잡기 (star-catcher)

[`followme.md`](../../followme.md) 튜토리얼의 완성본입니다.

위에서 떨어지는 별을 좌우 화살표(또는 A/D)로 받는 간단한 아케이드 게임. 라이프 0이 되면 게임 오버, 최고 점수는 IndexedDB에 저장됩니다.

## 실행

먼저 저장소 루트에서 엔진을 빌드합니다.

```bash
cd ../..
npm install
npm run build
```

그 다음 이 폴더에서 컴파일하고 정적 서버를 띄웁니다.

```bash
cd examples/star-catcher
npx tsc -p tsconfig.json

# 정적 서버 (저장소 루트에서)
cd ../..
python3 -m http.server 8080
```

브라우저에서 <http://localhost:8080/examples/star-catcher/> 열기.
