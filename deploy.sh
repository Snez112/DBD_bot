#!/bin/bash

# DBD Bot Auto Deploy Script
# Usage: ./deploy.sh [production|development]

set -e  # Exit on any error

ENV=${1:-development}
BOT_DIR="$HOME/bots/DBD_bot"
LOG_FILE="$BOT_DIR/deploy.log"

echo "🚀 DBD Bot Deploy Script"
echo "Environment: $ENV"
echo "Time: $(date)"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    error "Don't run this script as root!"
fi

# Check if bot directory exists
if [ ! -d "$BOT_DIR" ]; then
    error "Bot directory not found: $BOT_DIR"
fi

cd "$BOT_DIR"

# 1. Check prerequisites
log "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed!"
fi

NODE_VERSION=$(node --version)
log "Node.js version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    error "npm is not installed!"
fi

# Check PM2 for production
if [ "$ENV" = "production" ] && ! command -v pm2 &> /dev/null; then
    error "PM2 is not installed! Run: sudo npm install -g pm2"
fi

success "Prerequisites check passed"

# 2. Backup current version
log "Creating backup..."
BACKUP_DIR="$HOME/backups/dbd-bot_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$HOME/backups"
cp -r "$BOT_DIR" "$BACKUP_DIR" 2>/dev/null || warning "Backup failed, continuing..."
success "Backup created: $BACKUP_DIR"

# 3. Pull latest code (if git repo)
if [ -d ".git" ]; then
    log "Pulling latest code from git..."
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || warning "Git reset failed"
    success "Code updated"
else
    warning "Not a git repository, skipping git pull"
fi

# 4. Install/update dependencies
log "Installing dependencies..."
npm install --production
success "Dependencies installed"

# 5. Check .env file
log "Checking environment configuration..."
if [ ! -f ".env" ]; then
    error ".env file not found! Please create it with DISCORD_TOKEN and CLIENT_ID"
fi

# Check required env vars
if ! grep -q "DISCORD_TOKEN=" .env; then
    error "DISCORD_TOKEN not found in .env file"
fi

if ! grep -q "CLIENT_ID=" .env; then
    error "CLIENT_ID not found in .env file"
fi

# Set NODE_ENV
if [ "$ENV" = "production" ]; then
    if grep -q "NODE_ENV=" .env; then
        sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
    else
        echo "NODE_ENV=production" >> .env
    fi
fi

success "Environment configuration OK"

# 6. Build contexts
log "Building translation contexts..."
if npm run build-contexts; then
    success "Contexts built successfully"
else
    warning "Context building failed, continuing with existing contexts"
fi

# 7. Deploy commands
log "Deploying Discord slash commands..."
if npm run deploy-commands; then
    success "Commands deployed successfully"
else
    error "Failed to deploy commands"
fi

# 8. Start/restart bot
if [ "$ENV" = "production" ]; then
    log "Starting bot with PM2..."
    
    # Stop existing process if running
    pm2 stop dbd-bot 2>/dev/null || true
    pm2 delete dbd-bot 2>/dev/null || true
    
    # Start bot
    pm2 start src/bot.js --name dbd-bot
    
    # Setup startup script
    pm2 startup ubuntu -u $(whoami) --hp $(eval echo ~$(whoami)) 2>/dev/null || true
    pm2 save
    
    success "Bot started with PM2"
    
    # Show status
    pm2 status dbd-bot
    
else
    log "Development mode - starting bot normally..."
    warning "Bot will run in foreground. Press Ctrl+C to stop."
    npm start
fi

# 9. Cleanup old backups (keep last 5)
log "Cleaning up old backups..."
cd "$HOME/backups"
ls -t | grep "dbd-bot_" | tail -n +6 | xargs rm -rf 2>/dev/null || true
success "Cleanup completed"

# 10. Final status
echo ""
echo "================================"
success "Deploy completed successfully!"
echo ""
log "Bot Information:"
log "- Environment: $ENV"
log "- Directory: $BOT_DIR"
log "- Log file: $LOG_FILE"

if [ "$ENV" = "production" ]; then
    log "- PM2 status: pm2 status dbd-bot"
    log "- View logs: pm2 logs dbd-bot"
    log "- Restart: pm2 restart dbd-bot"
fi

echo ""
log "Generate invite link: npm run generate-invite"
echo ""
success "🎉 DBD Bot is ready to use!"
