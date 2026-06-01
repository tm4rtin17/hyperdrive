using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// A single ordered instruction within an operation.
/// Has a short Title (shown in the header bar) and a longer Body for detailed instructions.
/// </summary>
public sealed class OperationStep : Entity<StepId>
{
    public int Order { get; private set; }
    public string Title { get; private set; } = default!;
    public string Body { get; private set; } = default!;

    /// <summary>Role responsible for the primary buyoff of this step. Null until assigned.</summary>
    public WorkRole? PrimaryBuyoffRole { get; private set; }

    // EF
    private OperationStep() { }

    internal OperationStep(int order, string title)
        : base(StepId.New())
    {
        Order = order;
        Title = title.Trim();
        Body = string.Empty;
    }

    internal void Update(string title, string body, WorkRole? primaryBuyoffRole)
    {
        Title = title.Trim();
        Body = body.Trim();
        PrimaryBuyoffRole = primaryBuyoffRole;
    }

    internal void SetOrder(int order) => Order = order;
}
