.PHONY: help dev backend-up backend-down backend-logs seed test-auth frontend-install frontend-dev build clean

# Colores de salida
CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

help: ## Muestra la lista de comandos disponibles
	@echo "$(CYAN)Rey del Arrecife - Harness de Desarrollo$(RESET)"
	@echo "Uso: make [comando]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'

dev: backend-up ## Inicia PocketBase en Docker y lanza el frontend Angular con live-reload
	@echo "$(CYAN)Iniciando frontend Angular en host local...$(RESET)"
	@cd frontend && npm start

backend-up: ## Levanta el contenedor de PocketBase para desarrollo local
	@echo "$(CYAN)Levantando PocketBase en http://localhost:8090...$(RESET)"
	@cd backend && docker compose up -d

backend-down: ## Detiene el contenedor local de PocketBase
	@echo "$(CYAN)Deteniendo PocketBase...$(RESET)"
	@cd backend && docker compose down

backend-logs: ## Muestra los logs en tiempo real del contenedor de PocketBase
	@cd backend && docker compose logs -f

seed: ## Ejecuta la importación y migración de los datos de los CSV históricos
	@echo "$(CYAN)Importando datos de CSVs a PocketBase...$(RESET)"
	@cd backend && npm install && npm run seed

test-auth: ## Ejecuta las pruebas de integración del hook de autenticación OAuth2
	@echo "$(CYAN)Ejecutando pruebas de integración OAuth2 Whitelist...$(RESET)"
	@cd backend && npm run test:auth

test-guard: ## Ejecuta las pruebas de integración del hook de protección de inventario
	@echo "$(CYAN)Ejecutando pruebas de integración Inventory Guard...$(RESET)"
	@cd backend && npm run test:guard

test: ## Ejecuta todas las pruebas de backend (auth y guard)
	@echo "$(CYAN)Ejecutando todas las pruebas de backend...$(RESET)"
	@cd backend && npm test

frontend-install: ## Instala las dependencias del frontend Angular
	@cd frontend && npm install

frontend-dev: ## Inicia solo el servidor de desarrollo de Angular
	@cd frontend && npm start

build: ## Compila la aplicación Angular para producción
	@echo "$(CYAN)Compilando frontend Angular para producción...$(RESET)"
	@cd frontend && npm run build

clean: ## Limpia cachés de Angular y archivos temporales
	@rm -rf frontend/.angular frontend/dist
	@echo "$(GREEN)Cachés limpiadas.$(RESET)"
