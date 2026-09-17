# 홈랩 k3s 배포 런북 (FifthWing/mall 패턴)

도메인: `gantaek.doyosae.com` · 포트 3007 / NodePort 30071 · 이미지 `ghcr.io/doyosaee/gantaek`

## 1. 로컬 — 이미지 빌드 & 푸시 (Mac은 amd64 크로스빌드 필수)

```bash
cd ~/Dev/gantaekstack
docker buildx build --platform linux/amd64 -t ghcr.io/doyosaee/gantaek:latest --push .
```

(ghcr 로그인 안 돼 있으면: `echo <GH_PAT> | docker login ghcr.io -u doyosaee --password-stdin`)

## 2. 서버 — DB 생성 + 로컬 데이터 이관 (mall 때와 동일 패턴)

```bash
# 로컬 Mac에서 한 방에 (스키마+데이터 전부 — 별도 migrate 불필요)
docker exec gantaek-pg pg_dump -U postgres -d gantaekstack --no-owner --no-privileges \
  | ssh <서버> "kubectl exec -i <postgres-pod> -- psql -U postgres -d gantaek"
```

먼저 서버에서 DB 생성: `kubectl exec -it <postgres-pod> -- psql -U postgres -c 'CREATE DATABASE gantaek;'`

## 3. 서버 — 시크릿 + 매니페스트

```bash
kubectl create secret generic gantaek-secrets \
  --from-literal=DATABASE_URL='postgresql://postgres:<PW>@<POSTGRES_SVC>:5432/gantaek?schema=public' \
  --from-literal=GEMINI_API_KEY='<로컬 .env 값>' \
  --from-literal=GEMINI_MODEL='gemini-2.5-flash' \
  --from-literal=MOEF_API_KEY='<로컬 .env 값>' \
  --from-literal=CRON_SECRET="$(openssl rand -hex 16)"

kubectl apply -f k8s/deployment.yaml -f k8s/ingress.yaml -f k8s/cronjob.yaml
```

## 4. DNS

Cloudflare에 `gantaek.doyosae.com` A레코드 (mall/dungji와 동일 IP·설정).

## 5. 확인

- https://gantaek.doyosae.com — 홈 로드 + 진단 1회
- `/market` — 스탯이 로컬과 같은 수치인지 (= DB 이관 성공)
- cron 수동 검증: `kubectl create job --from=cronjob/gantaek-collect gantaek-collect-test`

## 함정 노트 (mall 6종 중 여기 해당분)

- Mac→서버는 `--platform linux/amd64` 없으면 exec format error
- 빌드 시 DATABASE_URL은 자리표시자로 충분 (전 페이지 force-dynamic, Dockerfile에 이미 넣음)
- prisma migrate 없음 — pg_dump가 스키마까지 옮기므로 initContainer 불필요. 이후 스키마 변경 시 `prisma db push`를 로컬→서버 DB 터널로
- NodePort 30071 — 기존 서비스와 충돌 시 이 파일만 수정
