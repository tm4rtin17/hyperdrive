using Hyperdrive.SharedKernel.Domain;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// A single operation in the build sequence (e.g. op 10 "Mill top face"). Owns an
/// ordered list of instruction steps.
/// </summary>
public sealed class Operation : Entity<OperationId>
{
    private readonly List<OperationStep> _steps = new();

    public int Sequence { get; private set; }
    public string Name { get; private set; } = default!;

    public IReadOnlyCollection<OperationStep> Steps => _steps;

    // EF
    private Operation() { }

    internal Operation(int sequence, string name)
        : base(OperationId.New())
    {
        Sequence = sequence;
        Name = name.Trim();
    }

    internal void Update(int sequence, string name)
    {
        Sequence = sequence;
        Name = name.Trim();
    }

    internal OperationStep AddStep(string text)
    {
        var order = _steps.Count == 0 ? 1 : _steps.Max(s => s.Order) + 1;
        var step = new OperationStep(order, text);
        _steps.Add(step);
        return step;
    }

    internal Result UpdateStep(StepId stepId, string text)
    {
        var step = _steps.FirstOrDefault(s => s.Id == stepId);
        if (step is null)
            return DomainError.NotFound("step.not_found", $"Step {stepId} not found.");
        step.UpdateText(text);
        return Result.Success();
    }

    internal Result RemoveStep(StepId stepId)
    {
        var step = _steps.FirstOrDefault(s => s.Id == stepId);
        if (step is null)
            return DomainError.NotFound("step.not_found", $"Step {stepId} not found.");

        _steps.Remove(step);
        // Re-pack ordering so steps stay 1..n contiguous.
        var i = 1;
        foreach (var s in _steps.OrderBy(s => s.Order))
            s.SetOrder(i++);
        return Result.Success();
    }
}
