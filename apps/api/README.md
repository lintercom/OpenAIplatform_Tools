# API Server

Fastify backend server pro AI Toolkit platformu.

## Endpoints

### Session
- `POST /session/start` - Vytvoří novou session

### Events
- `POST /event/track` - Trackuje event

### Tools
- `GET /tools` - Seznam všech tools
- `POST /tool/invoke` - Invokace toolu (admin only)

### Agent
- `POST /agent/next` - Spustí Router workflow
- `POST /agent/workflow/:id` - Spustí specifický workflow

### Admin
- `GET /admin/audit/tool-calls` - Audit logy (admin only)
- `GET /admin/workflow-runs` - Workflow runs (admin only)

## Spuštění

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Environment Variables

```env
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4-turbo-preview"
ADMIN_API_KEY="your-admin-key"
PORT=3000
```
