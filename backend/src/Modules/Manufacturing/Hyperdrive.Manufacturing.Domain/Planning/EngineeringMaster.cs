using Hyperdrive.SharedKernel.Domain;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// The per-part build definition: the ordered operations and their instruction steps
/// (the embedded routing) used to make a part. Work orders are generated from it.
/// References a part by number (free text); when the number matches an Engineering part
/// the link id + name are snapshotted for display, but the master can also be authored
/// for a part that does not yet exist.
/// </summary>
public sealed class EngineeringMaster : AggregateRoot<EngineeringMasterId>
{
    private const int FirstSequence = 510;
    private const int SequenceStep = 10;

    private readonly List<Operation> _operations = new();

    public string PartNumber { get; private set; } = default!;
    public Guid? PartId { get; private set; }
    public string? PartName { get; private set; }
    public EngineeringMasterStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public IReadOnlyCollection<Operation> Operations => _operations;

    // EF
    private EngineeringMaster() { }

    private EngineeringMaster(
        EngineeringMasterId id, string partNumber, Guid? partId, string? partName, DateTimeOffset createdAt)
        : base(id)
    {
        PartNumber = partNumber;
        PartId = partId;
        PartName = partName;
        Status = EngineeringMasterStatus.Draft;
        CreatedAt = createdAt;
    }

    public static Result<EngineeringMaster> Create(
        string partNumber, Guid? partId, string? partName, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(partNumber))
            return DomainError.Validation("master.part_number.empty", "Part number is required.");
        if (partNumber.Length > 64)
            return DomainError.Validation("master.part_number.too_long", "Part number must be ≤ 64 chars.");

        var master = new EngineeringMaster(
            EngineeringMasterId.New(),
            partNumber.Trim(),
            partId,
            string.IsNullOrWhiteSpace(partName) ? null : partName.Trim(),
            now);

        // Every new master gets a default first operation at the standard starting sequence.
        master._operations.Add(new Operation(FirstSequence, "New Operation"));

        return master;
    }

    // === Operations ===

    public Result<Operation> AddOperation(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return DomainError.Validation("operation.name.empty", "Operation name is required.");

        var sequence = _operations.Count == 0 ? FirstSequence : _operations.Max(o => o.Sequence) + SequenceStep;
        var operation = new Operation(sequence, name);
        _operations.Add(operation);
        return operation;
    }

    public Result UpdateOperation(OperationId operationId, int sequence, string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return DomainError.Validation("operation.name.empty", "Operation name is required.");

        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        operation.Update(sequence, name);
        return Result.Success();
    }

    public Result RemoveOperation(OperationId operationId)
    {
        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        _operations.Remove(operation);
        return Result.Success();
    }

    // === Steps (delegate to the owning operation) ===

    public Result<OperationStep> AddStep(OperationId operationId, string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return DomainError.Validation("step.text.empty", "Step text is required.");

        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        return operation.AddStep(text);
    }

    public Result UpdateStep(OperationId operationId, StepId stepId, string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return DomainError.Validation("step.text.empty", "Step text is required.");

        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        return operation.UpdateStep(stepId, text);
    }

    public Result RemoveStep(OperationId operationId, StepId stepId)
    {
        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        return operation.RemoveStep(stepId);
    }

    private Operation? Find(OperationId id) => _operations.FirstOrDefault(o => o.Id == id);
}
