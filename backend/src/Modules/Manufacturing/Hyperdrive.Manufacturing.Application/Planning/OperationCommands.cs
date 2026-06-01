using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record AddOperationCommand(Guid MasterId, string Name);
public sealed record UpdateOperationCommand(Guid MasterId, Guid OperationId, int Sequence, string Name, string Instructions, WorkRole? PrimaryBuyoffRole, WorkRole? SecondaryBuyoffRole);
public sealed record RemoveOperationCommand(Guid MasterId, Guid OperationId);

public sealed class AddOperationHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result<OperationDto>> HandleAsync(AddOperationCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.AddOperation(cmd.Name);
        if (result.IsFailure) return result.Error;

        await uow.SaveChangesAsync(ct);

        var op = result.Value!;
        return new OperationDto(op.Id.Value, op.Sequence, op.Name, op.Instructions, op.PrimaryBuyoffRole?.ToString(), op.SecondaryBuyoffRole?.ToString(), [], []);
    }
}

public sealed class UpdateOperationHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(UpdateOperationCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.UpdateOperation(new OperationId(cmd.OperationId), cmd.Sequence, cmd.Name, cmd.Instructions, cmd.PrimaryBuyoffRole, cmd.SecondaryBuyoffRole);
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class RemoveOperationHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(RemoveOperationCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.RemoveOperation(new OperationId(cmd.OperationId));
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
