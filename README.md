# Hyperdrive

Manufacturing-first ERP/MES platform. Operator-focused. Engineering-iteration-friendly. Built for high-velocity aerospace-style manufacturing.

This is the foundational shell — a modular monolith ready for the Manufacturing domain.

---

## Stack

| Layer        | Tech                                                  |
|--------------|-------------------------------------------------------|
| Backend      | ASP.NET Core 9, C#, EF Core, PostgreSQL               |
| Frontend     | Next.js 15 (App Router), React 19, TypeScript, Tailwind |
| Infra        | Docker Compose (dev), PostgreSQL 16                   |

## Architecture

Modular monolith. One process, one deployable, hard module boundaries.

```
hyperdrive/
├── backend/
│   ├── src/
│   │   ├── Host/                          # Composition root — Program.cs only
│   │   │   └── Hyperdrive.Api/
│   │   ├── Shared/
│   │   │   ├── Hyperdrive.SharedKernel/         # Entity, ValueObject, Result, IDomainEvent
│   │   │   └── Hyperdrive.SharedInfrastructure/ # EF base, event dispatcher, clock
│   │   └── Modules/
│   │       └── Manufacturing/
│   │           ├── Hyperdrive.Manufacturing.Domain/
│   │           ├── Hyperdrive.Manufacturing.Application/
│   │           ├── Hyperdrive.Manufacturing.Infrastructure/
│   │           └── Hyperdrive.Manufacturing.Api/   # only project the Host references
│   └── Hyperdrive.sln
│
├── frontend/
│   └── src/
│       ├── app/                            # Next.js App Router
│       │   └── (shell)/                    # Global nav layout group
│       │       ├── page.tsx                # Splash / launcher
│       │       └── manufacturing/
│       │           ├── parts/
│       │           ├── planning/
│       │           └── execution/
│       ├── modules/manufacturing/          # Module-owned UI components & hooks
│       ├── shared/
│       │   ├── components/{layout,navigation,ui}/
│       │   ├── config/navigation.ts        # Single source of truth for nav + splash
│       │   └── lib/api/
│       └── styles/
│
└── docker-compose.yml
```

### Module boundaries

A module is four projects:

| Project        | Owns                                              | References                              |
|----------------|---------------------------------------------------|-----------------------------------------|
| Domain         | Entities, value objects, domain events, contracts | SharedKernel                            |
| Application    | Commands, queries, handlers, DTOs                 | Domain                                  |
| Infrastructure | EF DbContext, repositories, migrations            | Application, SharedInfrastructure       |
| Api            | Endpoints, module registration                    | Application, Infrastructure             |

**The Host only references each module's `Api` project.** That is the only seam. Domain types do not leak into the Host. Other modules subscribe to integration events, not entities.

### Postgres schemas

Each module gets its own schema (`manufacturing`, future: `quality`, `inventory`). Cross-module reads go through the publishing module's Application layer or via integration events — never raw SQL joins across schemas.

### Events

`IDomainEventDispatcher` resolves `IDomainEventHandler<T>` from DI in-process. Same contract as a broker, so the swap to NATS/Kafka later is mechanical.

---

## Running locally

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API:      http://localhost:5080
- Swagger:  http://localhost:5080/swagger
- Postgres: localhost:5432  (user: `hyperdrive`, db: `hyperdrive`)

## Adding a new module

1. Create the four projects under `backend/src/Modules/<Module>/`.
2. Add an `AddXModule` + `MapXEndpoints` extension in the module's Api project.
3. Add two lines to `Program.cs`.
4. Add a `ModuleDefinition` entry to `frontend/src/shared/config/navigation.ts`.

That is the entire integration cost.
