# Testing Guide

## Run all tests
```bash
pnpm test                    # All packages
pnpm --filter server test    # Server only
pnpm --filter shared test    # Shared only
pnpm --filter mobile test    # Mobile only
```

## Coverage
```bash
pnpm --filter server test:coverage
```

## Watch mode
```bash
pnpm --filter server test:watch
```

## Test structure
- `*.test.ts` files co-located with source
- Mock Prisma with `vi.mock('../../lib/prisma', ...)`
- Auth tests use in-memory verification codes (dev mode: '123456')
