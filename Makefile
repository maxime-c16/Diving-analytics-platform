# ============================================
# DIVING ANALYTICS PLATFORM - MAKEFILE
# ============================================

# Docker Compose files
DOCKER_COMPOSE_BIN := $(shell if command -v docker-compose >/dev/null 2>&1; then echo docker-compose; else echo "docker compose"; fi)
COMPOSE = $(DOCKER_COMPOSE_BIN) -f docker-compose.yml
COMPOSE_OPT = $(DOCKER_COMPOSE_BIN) -f docker-compose.optimized.yml
COMPOSE_DEV = $(DOCKER_COMPOSE_BIN) -p diving-analytics-dev -f docker-compose.dev.yml

# Enable BuildKit for better performance
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Default target
.DEFAULT_GOAL := help

# ============================================
# HELP
# ============================================
.PHONY: help
help: ## Show this help message
	@echo "Diving Analytics Platform - Docker Management"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# ============================================
# STANDARD OPERATIONS
# ============================================
.PHONY: all
all: build up ## Build and start all services

.PHONY: build
build: ## Build all Docker images
	$(COMPOSE) build

.PHONY: build-opt
build-opt: ## Build with optimized Dockerfile configurations
	$(COMPOSE_OPT) build

.PHONY: build-parallel
build-parallel: ## Build all images in parallel (faster)
	$(COMPOSE) build --parallel

.PHONY: build-no-cache
build-no-cache: ## Build without using cache (clean build)
	$(COMPOSE) build --no-cache --pull

.PHONY: up
up: ## Start all services in detached mode
	$(COMPOSE) up -d

.PHONY: up-opt
up-opt: ## Start services with optimized configuration
	$(COMPOSE_OPT) up -d

.PHONY: down
down: ## Stop and remove containers
	$(COMPOSE) down

.PHONY: restart
restart: ## Restart all services
	$(COMPOSE) restart

.PHONY: re
re: down up ## Recreate all services (down + up)

# ============================================
# LOGS & MONITORING
# ============================================
.PHONY: logs
logs: ## Show logs for all services
	$(COMPOSE) logs -f

.PHONY: logs-api
logs-api: ## Show logs for API service only
	$(COMPOSE) logs -f api-service

.PHONY: logs-frontend
logs-frontend: ## Show logs for frontend service only
	$(COMPOSE) logs -f frontend

.PHONY: logs-compute
logs-compute: ## Show logs for compute service only
	$(COMPOSE) logs -f compute-service

.PHONY: ps
ps: ## Show status of all services
	$(COMPOSE) ps

.PHONY: stats
stats: ## Show resource usage statistics
	docker stats

# ============================================
# INDIVIDUAL SERVICES
# ============================================
.PHONY: build-backend
build-backend: ## Build backend service only
	$(COMPOSE) build api-service

.PHONY: build-frontend
build-frontend: ## Build frontend service only
	$(COMPOSE) build frontend

.PHONY: build-compute
build-compute: ## Build compute engine only
	$(COMPOSE) build compute-service

.PHONY: build-worker
build-worker: ## Build worker service only
	$(COMPOSE) build worker-service

# ============================================
# ANALYSIS & OPTIMIZATION
# ============================================
.PHONY: analyze
analyze: ## Analyze Docker image sizes
	@./scripts/analyze-images.sh

.PHONY: size
size: ## Show size of all custom images
	@echo "Custom Image Sizes:"
	@docker images | grep diving-analytics | awk '{printf "%-40s %s\n", $$1":"$$2, $$7}'

.PHONY: layers
layers: ## Show layers of backend image (requires dive)
	@if command -v dive > /dev/null; then \
		dive diving-analytics-backend:latest; \
	else \
		echo "Error: dive tool not installed. Install with: brew install dive"; \
	fi

.PHONY: health
health: ## Check health status of all services
	@$(COMPOSE) ps --format json | jq -r '.[] | "\(.Service)\t\(.Health)"'

# ============================================
# CLEANUP
# ============================================
.PHONY: clean
clean: down ## Stop services and remove containers
	$(COMPOSE) rm -f

.PHONY: fclean
fclean: clean ## Full clean: remove containers and volumes
	$(COMPOSE) down -v
	docker volume prune -f

.PHONY: prune
prune: ## Remove all unused Docker resources
	@echo "Warning: This will remove all unused images, containers, and networks"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker system prune -a -f; \
	fi

.PHONY: prune-build
prune-build: ## Clear Docker build cache
	docker builder prune -f

.PHONY: clean-images
clean-images: ## Remove all custom images
	docker rmi -f $$(docker images | grep diving-analytics | awk '{print $$3}')

# ============================================
# DEVELOPMENT
# ============================================
.PHONY: dev
dev: dev-infra ## Start development infra only

.PHONY: dev-infra
dev-infra: dev-infra-core dev-infra-ocr ## Start core dev infra plus OCR worker

.PHONY: dev-infra-core
dev-infra-core: ## Start only the core dev infra needed for local API/UI work
	$(COMPOSE_DEV) up -d mariadb redis

.PHONY: dev-infra-ocr
dev-infra-ocr: ## Start the OCR worker on top of core infra
	$(COMPOSE_DEV) --profile ocr up -d worker-service

.PHONY: dev-infra-compute
dev-infra-compute: ## Start the optional analytics/compute service
	$(COMPOSE_DEV) --profile compute up -d compute-service

.PHONY: dev-infra-down
dev-infra-down: ## Stop dev infra
	$(COMPOSE_DEV) down --remove-orphans

.PHONY: dev-reset
dev-reset: ## Remove dev infra containers and volumes for a clean restart
	$(COMPOSE_DEV) down -v --remove-orphans

.PHONY: dev-infra-logs
dev-infra-logs: ## Follow dev infra logs
	$(COMPOSE_DEV) logs -f

.PHONY: dev-backend
dev-backend: ## Run backend locally with watch mode against dev infra
	./scripts/dev-backend.sh

.PHONY: dev-frontend
dev-frontend: ## Run frontend locally with LAN-friendly hot reload
	./scripts/dev-frontend.sh

.PHONY: dev-status
dev-status: ## Show status of dev infra containers
	$(COMPOSE_DEV) ps

.PHONY: shell-backend
shell-backend: ## Open shell in backend container
	$(COMPOSE) exec api-service sh

.PHONY: shell-frontend
shell-frontend: ## Open shell in frontend container
	$(COMPOSE) exec frontend sh

.PHONY: shell-db
shell-db: ## Open MySQL shell in database
	$(COMPOSE) exec mariadb mysql -u diver -pdivepassword diving_db

# ============================================
# DATABASE
# ============================================
.PHONY: db-backup
db-backup: ## Backup database to file
	@mkdir -p backups
	$(COMPOSE) exec mariadb mysqldump -u root -prootpassword diving_db > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Database backed up to backups/"

.PHONY: db-restore
db-restore: ## Restore database from latest backup
	@latest=$$(ls -t backups/*.sql | head -1); \
	if [ -z "$$latest" ]; then \
		echo "No backup files found"; \
		exit 1; \
	fi; \
	echo "Restoring from $$latest"; \
	$(COMPOSE) exec -T mariadb mysql -u root -prootpassword diving_db < $$latest

# ============================================
# TESTING
# ============================================
.PHONY: test
test: ## Run all tests
	$(COMPOSE) exec api-service npm test

.PHONY: test-backend
test-backend: ## Run backend tests
	$(COMPOSE) exec api-service npm test

.PHONY: test-compute
test-compute: ## Run compute engine tests
	$(COMPOSE) exec compute-service pytest

# ============================================
# BENCHMARKING
# ============================================
.PHONY: benchmark-build
benchmark-build: ## Benchmark build times
	@echo "Benchmarking build times..."
	@echo "Fresh build:"
	@time $(MAKE) build-no-cache
	@echo "\nCached build:"
	@time $(MAKE) build

.PHONY: benchmark-size
benchmark-size: ## Show size comparison
	@echo "Image Size Comparison:"
	@echo "======================"
	@docker images | head -1
	@docker images | grep diving-analytics
	@echo ""
	@echo "Total size:"
	@docker images | grep diving-analytics | awk '{sum+=$$7} END {print sum" MB"}'
