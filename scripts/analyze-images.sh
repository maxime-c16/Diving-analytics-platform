#!/usr/bin/env zsh
# ============================================
# Docker Image Size Analyzer
# ============================================
# Usage: ./analyze-images.sh

set -e

echo "================================================"
echo "Docker Image Size Analysis"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "${RED}Error: Docker is not running${NC}"
    exit 1
fi

echo "Analyzing Diving Analytics Platform images..."
echo ""

# Function to check and display image
check_image() {
    local service=$1
    local image=$2
    local not_found_msg=$3
    
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}$"; then
        size=$(docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" "$image" 2>/dev/null | awk '{print $2}')
        printf "%-25s %-35s ${GREEN}%s${NC}\n" "$service" "$image" "$size"
        return 0
    else
        printf "%-25s %-35s ${RED}%s${NC}\n" "$service" "$image" "$not_found_msg"
        return 1
    fi
}

echo "Custom Application Images:"
echo "================================================"
printf "%-25s %-35s %s\n" "Service" "Image" "Size"
echo "------------------------------------------------"

check_image "Backend (NestJS)" "diving-analytics-backend:latest" "NOT BUILT" || true
check_image "Frontend (Next.js)" "diving-analytics-frontend:latest" "NOT BUILT" || true
check_image "Compute Engine" "diving-analytics-compute:latest" "NOT BUILT" || true
check_image "Worker Service" "diving-analytics-worker:latest" "NOT BUILT" || true

echo ""
echo "Base Images:"
echo "================================================"
printf "%-25s %-35s %s\n" "Service" "Image" "Size"
echo "------------------------------------------------"

check_image "Nginx" "nginx:1.25-alpine" "NOT PULLED" || true
check_image "MariaDB" "mariadb:10.11" "NOT PULLED" || true
check_image "Redis" "redis:7.2-alpine" "NOT PULLED" || true

echo ""
echo "================================================"
echo "Layer Analysis (run 'dive <image>' for details)"
echo "================================================"
echo ""
echo "To analyze a specific image in detail, run:"
echo "  docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock wagoodman/dive:latest <image-name>"
echo ""

# Check for dive tool
if command -v dive &> /dev/null; then
    echo "Dive tool is installed. You can use: dive diving-analytics-backend:latest"
else
    echo "Tip: Install dive tool for detailed image analysis:"
    echo "  brew install dive  (macOS)"
    echo "  or visit: https://github.com/wagoodman/dive"
fi

echo ""
echo "================================================"
echo "Summary & Statistics"
echo "================================================"
echo ""

# Count images
total_custom=$(docker images | grep -c "diving-analytics" || echo "0")
echo "Total custom images built: ${BLUE}${total_custom}${NC}"

# Show dangling images
dangling=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l | tr -d ' ')
if [ "$dangling" -gt 0 ]; then
    echo "${YELLOW}Found $dangling dangling images${NC}"
    echo "  → Run 'docker image prune' to remove them"
else
    echo "${GREEN}No dangling images found ✓${NC}"
fi

echo ""
echo "Docker System Disk Usage:"
docker system df

echo ""
echo "================================================"
echo "Optimization Recommendations"
echo "================================================"
echo ""
echo "Build Optimization:"
echo "  1. make build-parallel      # Build images in parallel"
echo "  2. make build-no-cache      # Fresh build without cache"
echo "  3. make build-opt            # Use optimized docker-compose"
echo ""
echo "Cleanup:"
echo "  1. make prune-build         # Clear build cache"
echo "  2. make clean-images        # Remove custom images"
echo "  3. make prune               # Full system cleanup"
echo ""
echo "Analysis:"
echo "  1. make size                # Quick size check"
echo "  2. make layers              # Inspect image layers (requires dive)"
echo "  3. docker history <image>   # View layer history"
echo ""
echo "Install dive tool for detailed analysis:"
echo "  brew install dive           # macOS"
echo "  dive <image-name>           # Analyze specific image"
echo ""
