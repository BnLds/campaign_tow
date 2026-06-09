# Tests

Tests run with Vitest:

```bash
pnpm test
```

Test files currently live in two places:

- `tests/`: integration tests, server-function tests, and older cross-cutting tests.
- `src/**/__tests__/`: tests close to the source file they cover.

Prefer colocated tests in `src/**/__tests__/` for new isolated domain, component, route, or query behavior. Use `tests/integration/` for flows that combine several layers.

Keep tests deterministic. Avoid relying on production data, external services, or secrets.
