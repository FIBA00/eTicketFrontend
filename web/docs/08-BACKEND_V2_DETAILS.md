# Backend v2 Details

## Stack
- Express 4 + TypeScript
- Drizzle ORM (plain TS schema)
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs
- Zod (validation)
- Pino (logging)

## Project structure

```
e-ticket-v2/
├── apps/api/
│   ├── drizzle/
│   │   └── seed.ts           # Idempotent seed script
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts     # All tables, enums, relations
│   │   │   └── index.ts      # Drizzle client + pg Pool
│   │   ├── config/
│   │   │   └── index.ts      # Env validation (Zod)
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── stations/
│   │   │   ├── vehicles/
│   │   │   ├── routes/
│   │   │   ├── tickets/      # placeholder
│   │   │   ├── finance/      # placeholder
│   │   │   ├── sync/         # placeholder
│   │   │   └── display/      # placeholder
│   │   └── shared/
│   │       ├── logger.ts
│   │       ├── errors.ts
│   │       ├── utils.ts
│   │       └── middleware/
│   │           ├── auth.ts
│   │           └── error.ts
│   ├── drizzle.config.ts
│   ├── package.json
│   └── Dockerfile
├── packages/
│   ├── shared-types/         # Zod schemas + TS types
│   └── money/                # Fare calculation engine
├── infra/
│   ├── docker-compose.yml
│   └── nginx/nginx.conf
└── docs/
```

## Key patterns

### Module pattern
Each module is a self-contained route file:
```typescript
// modules/users/users.routes.ts
export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/", requireRole(Role.SYSTEM_ADMIN), asyncHandler(async (req, res) => {
  // handler
}));
```

### Error handling
```typescript
// Custom error class
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) { super(message); }
}

// Async handler wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

// Error middleware
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details }
    });
    return;
  }
  // ... internal error
}
```

### Validation
```typescript
// Zod schema from shared package
import { createUserSchema } from "@e-ticket/shared-types";

// Middleware
export const validate = (schema: ZodSchema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    next(ValidationError(result.error.flatten()));
    return;
  }
  req.body = result.data;
  next();
};

// Usage
usersRouter.post("/", validate(createUserSchema), asyncHandler(async (req, res) => {
  // req.body is now typed and validated
}));
```

### Auth middleware
```typescript
// requireAuth — verifies JWT, attaches req.user
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(UnauthorizedError("Missing Authorization header"));
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(UnauthorizedError("Invalid or expired token"));
  }
}

// requireRole — restricts to specific roles
export function requireRole(...roles: Role[]) {
  return (req, _res, next) => {
    if (!req.user) { next(UnauthorizedError()); return; }
    if (!roles.includes(req.user.role)) {
      next(ForbiddenError(`Requires role: ${roles.join(" | ")}`));
      return;
    }
    next();
  };
}
```

## Drizzle schema pattern

```typescript
// Table definition
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  // ...
}, (t) => ({
  usernameIdx: uniqueIndex("users_username_idx").on(t.username),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  station: one(stations, { fields: [users.stationId], references: [stations.id] }),
  ticketsIssued: many(tickets),
}));
```

## Query pattern

```typescript
// Select with joins
const allVehicles = await db
  .select({
    id: vehicles.id,
    plateNumber: vehicles.plateNumber,
    agent: { id: users.id, fullName: users.fullName },
    station: { id: stations.id, name: stations.name },
  })
  .from(vehicles)
  .innerJoin(users, eq(vehicles.agentId, users.id))
  .innerJoin(stations, eq(vehicles.stationId, stations.id))
  .where(eq(vehicles.isActive, true))
  .orderBy(asc(vehicles.plateNumber));

// Insert with returning
const [user] = await db.insert(users).values({ ... }).returning();

// Update
const [updated] = await db.update(users)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(users.id, id))
  .returning();
```
