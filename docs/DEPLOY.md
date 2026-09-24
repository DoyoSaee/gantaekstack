# 홈랩 k3s 배포 런북 (FifthWing/mall 패턴 + CI/CD)

도메인: `gantaek.doyosae.com` · 포트 3007 / NodePort 30071 · 이미지 `ghcr.io/doyosaee/gantaek`

## 0. GitHub 리포 (한 번만, Mac)

1. github.com/new → `gantaekstack` (private 권장) 생성
2. ```bash
   cd ~/Dev/gantaekstack
   git remote add origin git@github.com:doyosaee/gantaekstack.git
   git push -u origin main
   ```
3. 이후 **main에 push하면 Actions가 자동으로 amd64 이미지 빌드→ghcr 푸시** (.github/workflows/deploy.yml)
   배포 반영은 서버에서: `kubectl rollout restart deploy/gantaek`

## 1. 첫 배포 — 서버에서 네이티브 빌드 (Actions 기다릴 필요 없이 바로)

```bash
git clone git@github.com:doyosaee/gantaekstack.git && cd gantaekstack
docker build -t ghcr.io/doyosaee/gantaek:latest .     # 서버가 amd64라 --platform 불필요
docker push ghcr.io/doyosaee/gantaek:latest            # ghcr 로그인 필요시: echo <PAT> | docker login ghcr.io -u doyosaee --password-stdin
```

## 2. DB 생성 + 데이터 이관 (스키마 포함 — 별도 migrate 불필요)

```bash
# 서버: DB 생성
kubectl exec -it <postgres-pod> -- psql -U postgres -c 'CREATE DATABASE gantaek;'

# Mac에서: 로컬 1,830건+스키마 통째로 이관
docker exec gantaek-pg pg_dump -U postgres -d gantaekstack --no-owner --no-privileges \
  | ssh <서버> "kubectl exec -i <postgres-pod> -- psql -U postgres -d gantaek"
```

## 3. 시크릿 + 매니페스트 (서버)

```bash
kubectl create secret generic gantaek-secrets \
  --from-literal=DATABASE_URL='postgresql://postgres:<PW>@<POSTGRES_SVC>:5432/gantaek?schema=public' \
  --from-literal=GEMINI_API_KEY='<로컬 .env 값>' \
  --from-literal=GEMINI_MODEL='gemini-3.6-flash' \
  --from-literal=MOEF_API_KEY='<로컬 .env 값>' \
  --from-literal=CRON_SECRET="$(openssl rand -hex 16)"

kubectl apply -f k8s/deployment.yaml -f k8s/ingress.yaml -f k8s/cronjob.yaml
```

## 4. DNS

Cloudflare `gantaek.doyosae.com` A레코드 (mall/dungji와 동일 IP).

## 5. 확인

- https://gantaek.doyosae.com 홈 + 진단 1회 + /match + /market 수치가 로컬과 동일한지(=이관 성공)
- cron 수동: `kubectl create job --from=cronjob/gantaek-collect gantaek-collect-test && kubectl logs job/gantaek-collect-test -f`

## 이후 업데이트 루틴 (CI/CD)

```bash
# Mac: 코드 수정 → git push        (Actions가 이미지 자동 빌드·푸시, ~3분)
# 서버: kubectl rollout restart deploy/gantaek
```

## 스키마 마이그레이션 (이후 변경 시)

베이스라인 `prisma/migrations/0_init` 커밋돼 있음. 스키마 바뀌면:
```bash
# Mac(로컬 DB): pnpm exec prisma migrate dev --name <변경명>  → 커밋
# 서버 DB 반영(터널 뚫고): DATABASE_URL=<서버DSN> pnpm exec prisma migrate deploy
# 서버 DB엔 첫 1회만: DATABASE_URL=<서버DSN> pnpm exec prisma migrate resolve --applied 0_init
```

## 함정 노트

- k3s는 containerd라 서버 docker 로컬 이미지 직접 인식 X → ghcr push 경유(위 흐름 그대로)
- 빌드 시 DATABASE_URL 자리표시자 OK (전 페이지 force-dynamic, Dockerfile에 내장)
- NodePort 30071 충돌 시 k8s/deployment.yaml만 수정
