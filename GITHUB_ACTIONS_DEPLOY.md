# GitHub Actions Deployment to GCP

이 문서는 GitHub Actions를 사용하여 Threadle을 GCP Compute Engine VM에 자동 배포하는 방법을 설명합니다.

## 📋 Prerequisites

### 1. GCP Service Account 생성

```bash
# Service Account 생성
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for GitHub Actions deployments"

# 필요한 권한 부여
gcloud projects add-iam-policy-binding threadle-478909 \
  --member="serviceAccount:github-actions-deployer@threadle-478909.iam.gserviceaccount.com" \
  --role="roles/compute.instanceAdmin.v1"

gcloud projects add-iam-policy-binding threadle-478909 \
  --member="serviceAccount:github-actions-deployer@threadle-478909.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# JSON 키 생성 및 다운로드
gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=github-actions-deployer@threadle-478909.iam.gserviceaccount.com

# 키 내용 확인 (GitHub Secrets에 추가할 내용)
cat ~/gcp-key.json
```

### 2. GitHub Secrets 설정

GitHub 레포지토리 Settings → Secrets and variables → Actions에서 다음 secrets 추가:

```
GCP_PROJECT_ID:     threadle-478909
GCP_SA_KEY:         <~/gcp-key.json 파일의 전체 내용>
GCP_VM_NAME:        threadle-vm
GCP_ZONE:           asia-northeast3-a
VM_EXTERNAL_IP:     34.158.197.106
```

선택적 secrets (앱 설정용):
```
SLACK_BOT_TOKEN:    xoxb-your-bot-token
SLACK_SIGNING_SECRET: your-signing-secret
OPENAI_API_KEY:     sk-your-openai-key
ANTHROPIC_API_KEY:  sk-ant-your-anthropic-key
GOOGLE_API_KEY:     your-google-api-key
```

## 📄 GitHub Actions Workflow

`.github/workflows/deploy-to-gcp.yml` 파일을 생성하세요:

```yaml
name: Deploy to GCP

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to GCP VM
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Deploy to VM
        env:
          VM_NAME: ${{ secrets.GCP_VM_NAME }}
          ZONE: ${{ secrets.GCP_ZONE }}
        run: |
          # Create deployment script
          cat > deploy.sh << 'EOF'
          #!/bin/bash
          set -e

          APP_DIR="/home/threadle-app"
          REPO_URL="https://github.com/${{ github.repository }}.git"

          echo "🔄 Updating application..."

          # Install Node.js if not present
          if ! command -v node &> /dev/null; then
            echo "📦 Installing Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs git build-essential
          fi

          # Clone or update repository
          if [ -d "$APP_DIR" ]; then
            echo "📥 Pulling latest changes..."
            cd $APP_DIR
            sudo git fetch origin
            sudo git reset --hard origin/main
          else
            echo "📥 Cloning repository..."
            sudo git clone $REPO_URL $APP_DIR
            sudo chown -R $USER:$USER $APP_DIR
          fi

          cd $APP_DIR

          # Install dependencies
          echo "📦 Installing dependencies..."
          npm install --production

          # Install client dependencies and build
          cd client
          npm install --production
          cd ..

          # Build application
          echo "🔨 Building application..."
          npm run build

          # Create or update systemd service
          echo "⚙️ Setting up systemd service..."
          sudo tee /etc/systemd/system/threadle.service > /dev/null << 'SERVICE'
          [Unit]
          Description=Threadle Slack Translator Bot
          After=network.target

          [Service]
          Type=simple
          User=$USER
          WorkingDirectory=$APP_DIR
          ExecStart=/usr/bin/node $APP_DIR/dist/server/index.js
          Restart=always
          RestartSec=10
          StandardOutput=journal
          StandardError=journal
          SyslogIdentifier=threadle

          Environment=NODE_ENV=production
          Environment=PORT=3000

          [Install]
          WantedBy=multi-user.target
          SERVICE

          # Reload systemd and restart service
          sudo systemctl daemon-reload
          sudo systemctl enable threadle

          if sudo systemctl is-active --quiet threadle; then
            echo "🔄 Restarting service..."
            sudo systemctl restart threadle
          else
            echo "🚀 Starting service..."
            sudo systemctl start threadle
          fi

          # Wait and check status
          sleep 3
          sudo systemctl status threadle --no-pager || true

          echo "✅ Deployment completed!"
          EOF

          # Make script executable
          chmod +x deploy.sh

          # Copy script to VM and execute
          gcloud compute scp deploy.sh $VM_NAME:~/deploy.sh --zone=$ZONE

          gcloud compute ssh $VM_NAME --zone=$ZONE --command="bash ~/deploy.sh"

      - name: Health Check
        run: |
          echo "🏥 Running health check..."
          sleep 10

          EXTERNAL_IP="${{ secrets.VM_EXTERNAL_IP }}"

          for i in {1..5}; do
            if curl -f -s http://$EXTERNAL_IP:3000/health > /dev/null; then
              echo "✅ Health check passed!"
              curl -s http://$EXTERNAL_IP:3000/health | jq
              exit 0
            fi
            echo "⏳ Waiting for service to start (attempt $i/5)..."
            sleep 10
          done

          echo "❌ Health check failed after 5 attempts"
          exit 1

      - name: Deployment Summary
        if: always()
        run: |
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo "📊 Deployment Summary"
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo "Repository: ${{ github.repository }}"
          echo "Commit: ${{ github.sha }}"
          echo "Branch: ${{ github.ref_name }}"
          echo "VM: ${{ secrets.GCP_VM_NAME }}"
          echo "Zone: ${{ secrets.GCP_ZONE }}"
          echo "URL: http://${{ secrets.VM_EXTERNAL_IP }}:3000"
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

## 🚀 사용 방법

### 자동 배포
```bash
# main 브랜치에 push하면 자동으로 배포됨
git add .
git commit -m "feat: new feature"
git push origin main
```

### 수동 배포
1. GitHub 레포지토리 → Actions 탭
2. "Deploy to GCP" 워크플로우 선택
3. "Run workflow" 클릭

## 🔍 배포 모니터링

### GitHub Actions에서 확인
- Actions 탭에서 워크플로우 실행 로그 확인
- 각 step별 진행 상황 및 에러 확인

### VM에서 직접 확인
```bash
# SSH 접속
gcloud compute ssh threadle-vm --zone=asia-northeast3-a

# 서비스 상태 확인
sudo systemctl status threadle

# 실시간 로그 확인
sudo journalctl -u threadle -f

# 최근 로그 확인
sudo journalctl -u threadle -n 100 --no-pager
```

## 🐛 트러블슈팅

### 배포 실패 시
```bash
# VM SSH 접속
gcloud compute ssh threadle-vm --zone=asia-northeast3-a

# 수동으로 앱 빌드 시도
cd /home/threadle-app
npm run build

# 서비스 재시작
sudo systemctl restart threadle

# 에러 로그 확인
sudo journalctl -u threadle -n 50 --no-pager
```

### Health Check 실패 시
```bash
# 포트가 열려있는지 확인
sudo netstat -tlnp | grep 3000

# Node.js 프로세스 확인
ps aux | grep node

# 방화벽 규칙 확인
gcloud compute firewall-rules list | grep threadle
```

## 🔐 보안 고려사항

1. **Service Account 권한 최소화**
   - 필요한 권한만 부여
   - 정기적으로 권한 검토

2. **Secrets 관리**
   - GitHub Secrets에만 저장
   - 로그에 노출되지 않도록 주의
   - 정기적으로 rotation

3. **VM 보안**
   - OS 자동 업데이트 설정
   - 불필요한 포트 닫기
   - SSH 키 기반 인증 사용

## 📈 고급 기능

### Blue-Green Deployment
VM 2개를 사용하여 무중단 배포:
```yaml
# .github/workflows/blue-green-deploy.yml
# (추가 설정 필요)
```

### Rollback 기능
```bash
# 이전 버전으로 롤백
gcloud compute ssh threadle-vm --zone=asia-northeast3-a --command="
  cd /home/threadle-app
  git reset --hard HEAD~1
  npm run build
  sudo systemctl restart threadle
"
```

### Slack 알림 추가
```yaml
# 배포 성공/실패 시 Slack 알림
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}: ${{ github.repository }}"
      }
```

## 📝 체크리스트

배포 전 확인사항:
- [ ] GCP Service Account 생성 완료
- [ ] GitHub Secrets 설정 완료
- [ ] VM이 RUNNING 상태인지 확인
- [ ] 방화벽 규칙이 올바른지 확인
- [ ] `.github/workflows/deploy-to-gcp.yml` 파일 추가
- [ ] main 브랜치에 push하여 배포 테스트

배포 후 확인사항:
- [ ] GitHub Actions 워크플로우 성공 확인
- [ ] Health check 엔드포인트 응답 확인
- [ ] Web 대시보드 접속 가능 확인
- [ ] 로그에 에러가 없는지 확인
