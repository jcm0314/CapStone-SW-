#!/usr/bin/env bash
# GCP VM(Ubuntu 24.04)에서 한 번 실행: Docker 설치 + 스왑 2GB 추가
# 사용법: bash deploy/vm/setup-vm.sh   (그다음 SSH 를 다시 접속해야 docker 그룹이 적용됨)
set -euo pipefail

echo "▶ 1/3 Docker 설치 (Ubuntu 공식 저장소)"
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-v2 git openssl
sudo systemctl enable --now docker
sudo usermod -aG docker "$(id -un)"

echo "▶ 2/3 스왑 2GB (빌드 중 메모리 부족 방지)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
free -h | head -3

echo "▶ 3/3 .env 준비"
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  cp env.example .env
  chmod 600 .env
  sed -i "s|^SSO_TOKEN_SECRET=.*|SSO_TOKEN_SECRET=$(openssl rand -hex 32)|" .env
  echo "  deploy/vm/.env 를 만들었어요 (SSO_TOKEN_SECRET 은 자동 생성)."
fi

echo
echo "✔ 완료. 다음 순서:"
echo "  1) exit 후 SSH 다시 접속 (docker 권한 적용)"
echo "  2) nano deploy/vm/.env  → PUBLIC_URL, ANTHROPIC_API_KEY, TUNNEL_TOKEN 채우기"
echo "  3) cd deploy/vm && docker compose up -d --build"
