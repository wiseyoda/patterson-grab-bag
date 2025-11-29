SHELL := /bin/bash

MIGRATION_NAME ?= dev-change

.PHONY: setup fmt lint test run build db-check db-migrate db-migrate-dev db-seed

setup:
	npm install

fmt:
	npm run fmt

lint:
	npm run lint

test:
	npm run test

run:
	npm run dev

build:
	npm run build

db-check:
	npm run db:check

db-migrate:
	npm run db:migrate

db-migrate-dev:
	MIGRATION_NAME=$(MIGRATION_NAME) npm run db:migrate:dev

db-seed:
	npm run db:seed
