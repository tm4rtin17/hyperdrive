using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Engineering.Domain.Parts.Events;

public sealed record PartCreatedEvent(
    PartId PartId,
    string PartNumber,
    string Revision) : DomainEvent;
