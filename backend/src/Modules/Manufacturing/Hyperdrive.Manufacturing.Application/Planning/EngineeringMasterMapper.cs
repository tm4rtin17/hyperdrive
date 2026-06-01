using Hyperdrive.Manufacturing.Domain.Planning;

namespace Hyperdrive.Manufacturing.Application.Planning;

public static class EngineeringMasterMapper
{
    /// <summary>Maps a master to DTO, including attachment metadata keyed by their owner ids.</summary>
    public static EngineeringMasterDto ToDto(
        this EngineeringMaster m,
        ILookup<Guid, StepAttachmentDto>? stepAttachments = null,
        ILookup<Guid, OperationAttachmentDto>? opAttachments = null,
        IReadOnlyList<MasterAttachmentDto>? masterAttachments = null) => new(
        m.Id.Value,
        m.PartNumber,
        m.Revision,
        m.PartId,
        m.PartName,
        m.Status.ToString(),
        m.CreatedAt,
        m.Description,
        m.Changelog,
        m.Approvers.ToList(),
        masterAttachments ?? [],
        m.Operations
            .OrderBy(o => o.Sequence)
            .Select(o => new OperationDto(
                o.Id.Value,
                o.Sequence,
                o.Name,
                o.Instructions,
                o.PrimaryBuyoffRoles.Select(r => r.ToString()).ToList(),
                o.SecondaryBuyoffRoles.Select(r => r.ToString()).ToList(),
                opAttachments?[o.Id.Value].ToList() ?? [],
                o.Steps.OrderBy(s => s.Order)
                    .Select(s => new StepDto(
                        s.Id.Value,
                        s.Order,
                        s.Title,
                        s.Body,
                        s.PrimaryBuyoffRoles.Select(r => r.ToString()).ToList(),
                        s.SecondaryBuyoffRoles.Select(r => r.ToString()).ToList(),
                        stepAttachments?[s.Id.Value].ToList() ?? []))
                    .ToList()))
            .ToList(),
        m.Dependencies
            .Select(d => new OperationLinkDto(d.PredecessorId, d.SuccessorId))
            .ToList());
}
