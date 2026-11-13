# Check-Mate 배포 가이드 (GCP VM + Cloudflare Tunnel)

> 대상: 팀원·멘토·심사위원에게 **허용한 사람만** 보여 주는 시연·테스트 서버
> 기존 Cloud Run 가이드([DEPLOY.md](DEPLOY.md))는 그대로 유효해요. 이 문서는 VM 한 대에 전부 올리는 다른 방식이에요.

## 0. 왜 이 방식인가
| | Cloud Run (DEPLOY.md) | VM + Tunnel (이 문서) |
|---|---|---|
| 접속 제한 | 누구나 접속 가능 | **Cloudflare Access로 허용한 이메일만** |
| AI 크레딧 | 평가 API에 로그인이 없어 주소만 알면 누구나 크레딧 사용 가능 | Access를 통과한 사람만 평가 가능 |
| 서비스 수 | 프론트·게이트웨이를 따로 배포, 주소 2개 | **도메인 1개**, 경로로 나눔(같은 출처라 CORS 불필요) |
| 열린 포트 | Google이 관리 | **들어오는 포트 0개** (터널은 나가는 연결만 씀) |

**지금 단계(공개 전 시연·테스트)에는 이 방식이 더 안전해요.** 평가 API에 로그인이 생기기 전까지는 Access로 막아 두는 걸 권장해요.

## 1. 구조
```
[브라우저] https://checkmate.<도메인>
    ▼
[Cloudflare Access]  허용한 이메일만 통과
    ▼ 터널
[GCP VM]  들어오는 포트: SSH만
  docker compose (deploy/vm/docker-compose.yml)
  ├─ tunnel       cloudflared → web:8080
  ├─ web          nginx: /  프론트,  /gw/ → api-gateway,  /core/ → core-api
  ├─ api-gateway  Claude 4-에이전트 평가 (ANTHROPIC_API_KEY)
  └─ core-api     (선택) Spring
```
- 프론트는 빌드할 때 `VITE_API_GATEWAY_URL=<PUBLIC_URL>/gw`로 자동 설정돼요. 직접 넣을 필요 없어요.
- API 키와 터널 토큰은 VM의 `deploy/vm/.env`에만 있어요. 이미지와 저장소에는 들어가지 않아요.

## 2. 준비물
- Cloudflare에 연결된 도메인 1개
- 결제 수단이 등록된 GCP 프로젝트
- Claude API 키 (Anthropic Console)

## 3. VM 만들기 (GCP 콘솔 → Compute Engine → VM 인스턴스 → 만들기)
| 항목 | 값 | 이유 |
|---|---|---|
| 리전 | `asia-northeast3` (서울) | 사용자가 한국 |
| 머신 | **`e2-small`** (2GB) | e2-micro(1GB)는 프론트 빌드 중 메모리가 모자라요. Spring까지 켜려면 `e2-medium` |
| 디스크 | Ubuntu 24.04 LTS, 균형 영구 디스크 20GB | Docker 이미지용 |
| 방화벽 | **HTTP/HTTPS 허용 체크 해제** | 터널이라 필요 없어요 |

> 비용은 무료 등급이 아니에요. 만들기 화면 오른쪽의 **월 예상 비용**을 확인하고, **결제 → 예산 및 알림**에서 예산 알림을 꼭 걸어 두세요. 안 쓸 때는 VM을 **중지**하면 디스크 비용만 나가요.

## 4. 코드 올리기
저장소가 비공개라서 VM에서 바로 `git clone`이 안 돼요. 둘 중 하나를 고르세요.

**A. 묶음 파일로 올리기 (처음 한 번 가장 쉬움)**
```bash
# 내 PC
cd CapStone-SW- && git bundle create ~/checkmate.bundle main
```
GCP 콘솔에서 VM의 **SSH** 버튼 → 오른쪽 위 **파일 업로드** → `checkmate.bundle` 선택 → VM에서:
```bash
git clone -b main ~/checkmate.bundle ~/CapStone-SW-
```

**B. 읽기 전용 배포 키 (업데이트가 잦을 때)**
VM에서 `ssh-keygen -t ed25519 -f ~/.ssh/checkmate -N ""` → 공개키를 저장소 관리자가 **Settings → Deploy keys**에 등록 (**쓰기 권한 체크 해제**) → `git clone git@github.com:jcm0314/CapStone-SW-.git` (`~/.ssh/config`에 키 지정)

## 5. 설치 스크립트
```bash
bash ~/CapStone-SW-/deploy/vm/setup-vm.sh
exit   # 다시 SSH 접속 (docker 권한 적용)
```
Docker 설치, 스왑 2GB, `deploy/vm/.env` 생성(SSO 서명 키 자동 생성)까지 해요.

## 6. Cloudflare Access 먼저 (잠금)
Cloudflare 대시보드 → **Zero Trust** (처음이면 팀 이름 정하고 Free 플랜)
1. **Settings → Authentication → Login methods**: `One-time PIN` 확인 (이메일로 6자리 코드)
2. **Access → Applications → Add an application → Self-hosted**
   - Application domain: `checkmate` . `<도메인>`
3. **Policy**: Action `Allow`, Include → `Emails` → 팀원·멘토 이메일 (또는 `Emails ending in`으로 학교 도메인)

> 메뉴 이름은 Cloudflare가 자주 바꿔요. 다르면 비슷한 위치에서 찾으면 돼요.

## 7. 터널 만들기
Zero Trust → **Networks → Tunnels → Create a tunnel → Cloudflared**
1. 이름 `checkmate-vm` → 설치 화면에서 **Docker**를 고르고, 명령어 속 `--token` 뒤의 `eyJ...` 값만 복사
   - 이 토큰은 비밀번호예요. 채팅·이슈·커밋에 붙여 넣지 마세요.
2. **Public Hostname**: Subdomain `checkmate`, Domain `<도메인>`, Service **`HTTP`** → **`web:8080`**
   - `localhost`가 아니라 `web`이에요. 터널이 같은 docker 네트워크 안의 컨테이너로 연결하기 때문이에요.

## 8. 값 채우고 실행
```bash
cd ~/CapStone-SW-/deploy/vm
nano .env    # PUBLIC_URL=https://checkmate.<도메인>, ANTHROPIC_API_KEY, TUNNEL_TOKEN
docker compose up -d --build     # 첫 빌드는 5~10분
docker compose ps                # web, api-gateway, tunnel 이 running
curl -s localhost:8080/gw/health # {"status":"UP",...}
```

## 9. 확인 체크리스트
- [ ] 휴대폰에서 `https://checkmate.<도메인>` → 이메일 코드 → 지원자 목록 화면
- [ ] 자기소개서 1건 AI 평가 → 30초 안팎에 점수와 근거 하이라이트가 나온다
- [ ] 시크릿 창에서 허용 안 된 이메일 → 막힌다
- [ ] `sudo reboot` 후 1~2분 뒤 다시 접속된다 (`restart: unless-stopped`)

## 10. 업데이트
```bash
cd ~/CapStone-SW- && git pull     # A 방식이면 새 bundle 을 올린 뒤: git pull ~/checkmate.bundle main
cd deploy/vm && docker compose up -d --build
```

## 11. 알려진 한계
| 항목 | 내용 | 대응 |
|---|---|---|
| 공유 링크 | 면접관 공유 링크(`/?share=...`)도 Access 로그인이 필요해요 | 받는 사람 이메일을 Access 정책에 추가 |
| 속도 제한 | 게이트웨이 속도 제한(15분 200회)이 nginx 뒤라서 **사용자 전체가 한 묶음**으로 계산돼요 | 소규모 시연에는 충분. 공개 전 `trust proxy` 설정 필요 |
| 데이터 | 지원자 데이터는 각자 브라우저(localStorage)에 저장돼요. 다른 기기에서는 안 보여요 | Spring 연동(로그인 화면)이 붙으면 해결 |
| Spring | 운영 빌드에는 Spring 로그인 화면이 없어서 켜도 화면에서 쓰이지 않아요 | `docker compose --profile core up -d` 로 API만 미리 띄워 볼 수 있음. `JWT_SECRET`, `CHECKMATE_SEED_PASSWORD` 필수 |

## 12. 급할 때
| 상황 | 명령 |
|---|---|
| 외부 접속 즉시 차단 | `docker compose stop tunnel` |
| 로그 보기 | `docker compose logs -f --tail=50 api-gateway` |
| AI 키 교체 | `.env` 수정 → `docker compose up -d api-gateway` |
| 전부 끄기 | `docker compose down` (또는 GCP 콘솔에서 VM 중지) |
