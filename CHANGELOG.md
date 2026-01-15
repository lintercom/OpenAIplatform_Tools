# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Tool Registry s validací, policy enforcement a audit logging
- Policy Engine: rate limiting, domain whitelist, role-based access
- Audit Logger s PII redakcí
- Built-in tools: session, lead, event, catalog, template, message, crm, pricing, verify
- OpenAI Runtime: WorkflowRunner s tool calling a tracing
- Workflow Templates: router, qualification, booking
- OpenAI Doc Sync: fetcher, parser, full-text search, CLI
- Adapters: mock implementace pro CRM, Email, Calendar, Storage
- API Server: Fastify backend s endpoints
- Demo UI: React aplikace
- GitHub Actions: CI/CD workflows
- Dokumentace: README, QUICKSTART, ARCHITECTURE, DEPLOYMENT, USAGE

### Infrastructure
- Prisma schema s PostgreSQL
- Docker Compose pro lokální vývoj
- Seed data pro katalog a templates
- Testy pro registry a tools

[1.0.0]: https://github.com/YOUR_USERNAME/ai-toolkit-openai-platform/releases/tag/v1.0.0
