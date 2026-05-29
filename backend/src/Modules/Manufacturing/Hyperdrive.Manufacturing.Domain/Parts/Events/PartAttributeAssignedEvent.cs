using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Manufacturing.Domain.Parts.Events;

public sealed record PartAttributeAssignedEvent(
    PartId PartId,
    string Key,
    string Value) : DomainEvent;
