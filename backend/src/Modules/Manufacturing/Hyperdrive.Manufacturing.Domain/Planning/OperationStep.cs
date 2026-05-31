using Hyperdrive.SharedKernel.Domain;

namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// A single ordered instruction within an operation.
/// </summary>
public sealed class OperationStep : Entity<StepId>
{
    public int Order { get; private set; }
    public string Text { get; private set; } = default!;

    // EF
    private OperationStep() { }

    internal OperationStep(int order, string text)
        : base(StepId.New())
    {
        Order = order;
        Text = text.Trim();
    }

    internal void UpdateText(string text) => Text = text.Trim();

    internal void SetOrder(int order) => Order = order;
}
