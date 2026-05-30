using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Parts;
using Hyperdrive.SharedKernel.Results;
using Hyperdrive.SharedKernel.Time;

namespace Hyperdrive.Manufacturing.Application.Parts;

public sealed record CreatePartCommand(string PartNumber, string Name);

public sealed class CreatePartHandler(
    IPartRepository repository,
    IUnitOfWork uow,
    IClock clock)
{
    public async Task<Result<PartDto>> HandleAsync(CreatePartCommand cmd, CancellationToken ct)
    {
        var numberResult = PartNumber.Create(cmd.PartNumber);
        if (numberResult.IsFailure) return numberResult.Error;

        var number = numberResult.Value!;

        if (await repository.ExistsAsync(number, ct))
            return DomainError.Conflict("part.duplicate", $"Part {number} already exists.");

        var partResult = Part.Create(number, cmd.Name, clock.UtcNow);
        if (partResult.IsFailure) return partResult.Error;

        var part = partResult.Value!;
        await repository.AddAsync(part, ct);
        await uow.SaveChangesAsync(ct);

        return part.ToDto();
    }
}
