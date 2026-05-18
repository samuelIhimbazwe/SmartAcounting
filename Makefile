.PHONY: dev prod-up prod-down test e2e deploy backup logs smoke

dev:
	docker compose up -d
	./gradlew.bat bootRun --args="--spring.profiles.active=dev"

prod-up:
	docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

test:
	./gradlew.bat test
	cd frontend && npm run test -- --run

e2e:
	cd frontend && npx playwright test

deploy:
	@echo "Use GitHub Actions deploy job or: docker compose -f docker-compose.prod.yml pull && up -d"

backup:
	bash ./scripts/backup-prod.sh

logs:
	docker compose -f docker-compose.prod.yml logs -f --tail=200

smoke:
	powershell -ExecutionPolicy Bypass -File ./scripts/prod-smoke.ps1
