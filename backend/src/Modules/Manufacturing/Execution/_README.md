# Execution

Aggregates that will live here:

- `WorkOrderExecution` — operator-facing state machine over a released WorkOrder (Started, Paused, Completed, NonConformance).
- `OperationLog` — immutable, append-only record of every op step (who, when, measurement, attachment).
- `NonConformanceReport` — quality holds raised mid-execution.

Boundary: Execution **subscribes** to `WorkOrderReleased` from Planning and **emits**
`OperationCompleted` / `NonConformanceRaised` events that Quality and Inventory consume.
