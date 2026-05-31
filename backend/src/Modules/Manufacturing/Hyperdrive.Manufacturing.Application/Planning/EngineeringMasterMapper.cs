using Hyperdrive.Manufacturing.Domain.Planning;

namespace Hyperdrive.Manufacturing.Application.Planning;

public static class EngineeringMasterMapper
{
    public static EngineeringMasterDto ToDto(this EngineeringMaster m) => new(
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
                    .Select(s => new StepDto(s.Id.Value, s.Order, s.Text))
                    .ToList()))
            .ToList());
}
