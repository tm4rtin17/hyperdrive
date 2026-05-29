using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Manufacturing.Domain.Parts.Events;

public sealed record PartCreatedEvent(
    PartId PartId,
    string PartNumber,
    string Revision) : DomainEvent;
