using Hyperdrive.Manufacturing.Domain.Planning;

namespace Hyperdrive.Manufacturing.Application.Planning;

public static class EngineeringMasterMapper
{
    /// <summary>Maps a master to DTO, including attachment metadata keyed by step id.</summary>
    public static EngineeringMasterDto ToDto(
        this EngineeringMaster m,
        ILookup<Guid, StepAttachmentDto>? attachments = null) => new(
        m.Id.Value,
        m.PartNumber,
        m.PartId,
        m.PartName,
        m.Status.ToString(),
        m.CreatedAt,
        m.Operations
            .OrderBy(o => o.Sequence)
            .Select(o => new OperationDto(
                o.Id.Value,
                o.Sequence,
                o.Name,
                o.Steps.OrderBy(s => s.Order)
                    .Select(s => new StepDto(
                        s.Id.Value,
                        s.Order,
                        s.Title,
                        s.Body,
                        attachments?[s.Id.Value].ToList() ?? []))
                    .ToList()))
            .ToList(),
        m.Dependencies
            .Select(d => new OperationLinkDto(d.PredecessorId, d.SuccessorId))
            .ToList());
}
