# Planning

Aggregates that will live here:

- `ManufacturingPlan` — versioned definition of how to build a part (routing + ops).
- `WorkInstruction` — a single op's instruction sheet (text, media, tooling, quality holds).
- `WorkOrder` — a released, scheduled instance of a plan for a specific quantity / lot / serial.

Boundary: Planning **consumes** released Parts (via Part events / queries on the Parts side)
and **produces** WorkOrder events that Execution consumes. Planning never reads Execution state.
