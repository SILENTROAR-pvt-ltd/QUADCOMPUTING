# 10 CI/CD, ENV, and Deployment

This report outlines the deployment infrastructure, environment variables, and Vercel readiness.

## Infrastructure Presence
- **.github/workflows**: Missing
- **vercel.json**: Missing
- **Dockerfile**: Missing
- **.husky**: Missing
- **package.json**: Present
- **.env.example**: Missing
- **supabase/config.toml**: Missing

*Note on git strategy: If .git is missing, version control and branch strategies are non-existent locally.*

## Environment Variables
| Variable | Used In | In .env.example | Client Exposed? | Notes |
|---|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | 15 files | No | Yes |  |
| SUPABASE_SERVICE_ROLE_KEY | 4 files | No | No |  |
| GEMINI_API_KEY | 2 files | No | No |  |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 14 files | No | Yes |  |
| NODE_ENV | 1 files | No | No |  |
| UPSTASH_REDIS_REST_URL | 2 files | No | No |  |
| UPSTASH_REDIS_REST_TOKEN | 2 files | No | No |  |
| PORT | 2 files | No | No |  |
| SMOKE_A_EMAIL | 1 files | No | No |  |
| SMOKE_A_PASSWORD | 1 files | No | No |  |
| SMOKE_B_EMAIL | 1 files | No | No |  |
| SMOKE_B_PASSWORD | 1 files | No | No |  |
| BASE_URL | 1 files | No | No |  |

## Vercel Readiness
- Files with `export const dynamic`: 19
- Files with Edge runtime: 0
- Middleware `getUser` calls (cost on every request): 1
