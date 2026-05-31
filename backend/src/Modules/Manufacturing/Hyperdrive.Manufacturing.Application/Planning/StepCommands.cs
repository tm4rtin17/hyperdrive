using Hyperdrive.Manufacturing.Application.Abstractions;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Application.Planning;

public sealed record AddStepCommand(Guid MasterId, Guid OperationId, string Text);
public sealed record UpdateStepCommand(Guid MasterId, Guid OperationId, Guid StepId, string Text);
public sealed record RemoveStepCommand(Guid MasterId, Guid OperationId, Guid StepId);

public sealed class AddStepHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result<StepDto>> HandleAsync(AddStepCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.AddStep(new OperationId(cmd.OperationId), cmd.Text);
        if (result.IsFailure) return result.Error;

        await uow.SaveChangesAsync(ct);

        var step = result.Value!;
        return new StepDto(step.Id.Value, step.Order, step.Text);
    }
}

public sealed class UpdateStepHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(UpdateStepCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.UpdateStep(new OperationId(cmd.OperationId), new StepId(cmd.StepId), cmd.Text);
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed class RemoveStepHandler(IEngineeringMasterRepository repository, IUnitOfWork uow)
{
    public async Task<Result> HandleAsync(RemoveStepCommand cmd, CancellationToken ct)
    {
        var master = await repository.GetAsync(new EngineeringMasterId(cmd.MasterId), ct);
        if (master is null)
            return DomainError.NotFound("master.not_found", $"Engineering master {cmd.MasterId} not found.");

        var result = master.RemoveStep(new OperationId(cmd.OperationId), new StepId(cmd.StepId));
        if (result.IsFailure) return result;

        await uow.SaveChangesAsync(ct);
        return Result.Success();
    }
}
