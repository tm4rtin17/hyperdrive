# Planning

Aggregates that will live here:

- `WorkInstruction` — a single op's instruction sheet (text, media, tooling, quality holds).
  Op sequences (routing) are embedded directly on the WorkInstruction rather than managed as a
  separate Routing aggregate. Engineering part masters carry the reference; WorkOrders snapshot it.
- `WorkOrder` — a released, scheduled instance of work for a specific quantity / lot / serial.
  Captures the part, quantity, revision, and the embedded op sequence at time of release.

Boundary: Planning **consumes** released Parts (via Part events / queries on the Parts side)
and **produces** WorkOrder events that Execution consumes. Planning never reads Execution state.
