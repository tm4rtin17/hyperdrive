# Planning

Aggregates that will live here:

- `EngineeringMaster` — the per-part build definition: the embedded op sequence (routing),
  instructions (text, media, tooling, quality holds), and any other data needed to make the part.
  Op sequences live inside the master rather than as a separate Routing aggregate.
- `WorkOrder` — generated from an `EngineeringMaster` for a specific quantity / lot / serial.
  Snapshots the part, revision, and the master's op sequence at time of release.

Boundary: Planning **consumes** released Parts (via Part events / queries on the Parts side)
and **produces** WorkOrder events that Execution consumes. Planning never reads Execution state.
