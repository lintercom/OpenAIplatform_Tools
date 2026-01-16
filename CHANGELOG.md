# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

#### Core Platform
- Tool Registry s validací, policy enforcement a audit logging
- Policy Engine: rate limiting, domain whitelist, role-based access, ABAC
- Audit Logger s PII redakcí
- Enterprise Tool Contract standard (`@ai-toolkit/tool-contract`)
- Observability package (`@ai-toolkit/observability`) - tracing, logging, metrics
- Per-tenant API key management s šifrováním

#### Built-in Tools
- Session tools: start, get, set_consent
- Lead tools: get_or_create, update, set_stage, add_tags, score
- Event tools: track, timeline
- Catalog tools: get_services, get_service, get_faq
- Template tools: render
- Message tools: send_template, send_for_review
- CRM tools: upsert_lead, create_task
- Pricing tools: get_rules, get_allowed_offer
- Verify tools: search, fetch, extract, compare

#### Runtime & Workflows
- OpenAI Runtime: WorkflowRunner s tool calling a tracing
- Workflow Templates: router, qualification, booking
- OpenAI Doc Sync: fetcher, parser, full-text search, CLI
- Adapters: mock implementace pro CRM, Email, Calendar, Storage

#### Infrastructure
- API Server: Fastify backend s endpoints
- Demo UI: React aplikace
- GitHub Actions: CI/CD workflows
- Prisma schema s PostgreSQL
- Docker Compose pro lokální vývoj
- Seed data pro katalog a templates
- Testy pro registry a tools

#### Developer Experience
- Tool Authoring Kit: CLI pro vytváření nových tools
- Tool Discovery: automatické načítání tools
- CLI příkazy: tools:list, tools:validate, tools:docs
- Pre-publish check script

#### Documentation
- Kompletní dokumentace včetně AI Tools Reference
- Architecture Decision Records (ADR)
- Installation a Usage guides
- API Key Management guide

[1.0.0]: https://github.com/lintercom/OpenAIplatform_Tools/releases/tag/v1.0.0
