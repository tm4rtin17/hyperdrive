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
    public string Instructions { get; private set; } = string.Empty;

    /// <summary>Role responsible for the primary buyoff of this operation. Null until assigned.</summary>
    public WorkRole? PrimaryBuyoffRole { get; private set; }

    /// <summary>Optional second-party witness/co-signoff role. Null until assigned.</summary>
    public WorkRole? SecondaryBuyoffRole { get; private set; }

    public IReadOnlyCollection<OperationStep> Steps => _steps;

    // EF
    private Operation() { }

    internal Operation(int sequence, string name)
        : base(OperationId.New())
    {
        Sequence = sequence;
        Name = name.Trim();
    }

    internal void Update(int sequence, string name, string instructions, WorkRole? primaryBuyoffRole, WorkRole? secondaryBuyoffRole)
    {
        Sequence = sequence;
        Name = name.Trim();
        Instructions = instructions ?? string.Empty;
        PrimaryBuyoffRole = primaryBuyoffRole;
        SecondaryBuyoffRole = secondaryBuyoffRole;
    }

    internal OperationStep AddStep(string title)
    {
        var order = _steps.Count == 0 ? 10 : _steps.Max(s => s.Order) + 10;
        var step = new OperationStep(order, title);
        _steps.Add(step);
        return step;
    }

    internal Result UpdateStep(StepId stepId, int order, string title, string body, WorkRole? primaryBuyoffRole, WorkRole? secondaryBuyoffRole)
    {
        var step = _steps.FirstOrDefault(s => s.Id == stepId);
        if (step is null)
            return DomainError.NotFound("step.not_found", $"Step {stepId} not found.");
        step.SetOrder(order);
        step.Update(title, body, primaryBuyoffRole, secondaryBuyoffRole);
        return Result.Success();
    }

    internal Result RemoveStep(StepId stepId)
    {
        var step = _steps.FirstOrDefault(s => s.Id == stepId);
        if (step is null)
            return DomainError.NotFound("step.not_found", $"Step {stepId} not found.");

        _steps.Remove(step);
        // Re-pack ordering in 10-step increments so gaps don't accumulate after removals.
        var i = 10;
        foreach (var s in _steps.OrderBy(s => s.Order))
        {
            s.SetOrder(i);
            i += 10;
        }
        return Result.Success();
    }
}
