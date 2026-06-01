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

    private const int MaxPartNumberLength = 64;
    private static readonly System.Text.RegularExpressions.Regex RevisionPattern =
        new("^[A-Z]{1,3}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private readonly List<Operation> _operations = new();
    private readonly List<OperationLink> _dependencies = new();
    private readonly List<string> _approvers = new();

    public string PartNumber { get; private set; } = default!;
    public Guid? PartId { get; private set; }
    public string? PartName { get; private set; }
    public EngineeringMasterStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>
    /// Letter-based revision designator (A–Z, then AA–ZZ, etc.).
    /// Revisions within the same part number are interchangeable; non-interchangeable
    /// changes require a part-number roll (e.g. -501 → -502).
    /// </summary>
    public string Revision { get; private set; } = "A";

    /// <summary>Free-text notes / general information about the product. May contain HTML.</summary>
    public string Description { get; private set; } = string.Empty;

    /// <summary>Manually maintained revision history. May contain HTML.</summary>
    public string Changelog { get; private set; } = string.Empty;

    /// <summary>Names of people who must approve the master before release. Placeholder for a richer approval flow.</summary>
    public IReadOnlyList<string> Approvers => _approvers;

    public IReadOnlyCollection<Operation> Operations => _operations;

    /// <summary>Precedence edges (predecessor → successor) defining the build order. Forms a DAG.</summary>
    public IReadOnlyCollection<OperationLink> Dependencies => _dependencies;

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
        var partNumberCheck = ValidatePartNumber(partNumber);
        if (partNumberCheck.IsFailure) return partNumberCheck.Error;

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

    /// <summary>
    /// Updates the master "header": part number plus the free-text description, changelog and approver list.
    /// The part number is free text and is not re-linked to an Engineering part here.
    /// </summary>
    public Result UpdateHeader(string partNumber, string revision, string description, string changelog, IEnumerable<string> approvers)
    {
        var partNumberCheck = ValidatePartNumber(partNumber);
        if (partNumberCheck.IsFailure) return partNumberCheck;

        var revisionCheck = ValidateRevision(revision);
        if (revisionCheck.IsFailure) return revisionCheck;

        PartNumber = partNumber.Trim();
        Revision = revision.Trim().ToUpperInvariant();
        Description = description ?? string.Empty;
        Changelog = changelog ?? string.Empty;

        _approvers.Clear();
        _approvers.AddRange((approvers ?? [])
            .Select(a => a?.Trim() ?? string.Empty)
            .Where(a => a.Length > 0));

        return Result.Success();
    }

    private static Result ValidatePartNumber(string partNumber)
    {
        if (string.IsNullOrWhiteSpace(partNumber))
            return DomainError.Validation("master.part_number.empty", "Part number is required.");
        if (partNumber.Trim().Length > MaxPartNumberLength)
            return DomainError.Validation("master.part_number.too_long", $"Part number must be ≤ {MaxPartNumberLength} chars.");
        return Result.Success();
    }

    private static Result ValidateRevision(string revision)
    {
        if (string.IsNullOrWhiteSpace(revision))
            return DomainError.Validation("master.revision.empty", "Revision is required.");
        if (!RevisionPattern.IsMatch(revision.Trim().ToUpperInvariant()))
            return DomainError.Validation("master.revision.invalid", "Revision must be 1–3 uppercase letters (A–Z).");
        return Result.Success();
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

    public Result UpdateOperation(OperationId operationId, int sequence, string name, string instructions, WorkRole? primaryBuyoffRole, WorkRole? secondaryBuyoffRole)
    {
        if (string.IsNullOrWhiteSpace(name))
            return DomainError.Validation("operation.name.empty", "Operation name is required.");

        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        operation.Update(sequence, name, instructions, primaryBuyoffRole, secondaryBuyoffRole);
        return Result.Success();
    }

    public Result RemoveOperation(OperationId operationId)
    {
        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        _operations.Remove(operation);
        // Drop any sequence links that referenced the removed operation.
        _dependencies.RemoveAll(d =>
            d.PredecessorId == operationId.Value || d.SuccessorId == operationId.Value);
        return Result.Success();
    }

    // === Sequence (precedence DAG over operations) ===

    /// <summary>
    /// Replaces the entire precedence graph. Validates that every link references operations
    /// belonging to this master, contains no self-links, and forms no cycle (must stay a DAG).
    /// Duplicate links are de-duplicated.
    /// </summary>
    public Result SetSequence(IEnumerable<(Guid Predecessor, Guid Successor)> links)
    {
        var operationIds = _operations.Select(o => o.Id.Value).ToHashSet();
        var seen = new HashSet<(Guid, Guid)>();
        var cleaned = new List<(Guid Predecessor, Guid Successor)>();

        foreach (var (predecessor, successor) in links)
        {
            if (predecessor == successor)
                return DomainError.Validation("sequence.self_link", "An operation cannot depend on itself.");
            if (!operationIds.Contains(predecessor) || !operationIds.Contains(successor))
                return DomainError.Validation("sequence.unknown_operation",
                    "A link references an operation that is not part of this master.");
            if (seen.Add((predecessor, successor)))
                cleaned.Add((predecessor, successor));
        }

        if (HasCycle(cleaned, operationIds))
            return DomainError.Validation("sequence.cycle", "The sequence must not contain a cycle.");

        _dependencies.Clear();
        foreach (var (predecessor, successor) in cleaned)
            _dependencies.Add(new OperationLink(predecessor, successor));

        return Result.Success();
    }

    // Kahn's algorithm: if not every node can be removed in topological order, a cycle exists.
    private static bool HasCycle(
        IReadOnlyList<(Guid Predecessor, Guid Successor)> links, HashSet<Guid> nodes)
    {
        var indegree = nodes.ToDictionary(n => n, _ => 0);
        var adjacency = nodes.ToDictionary(n => n, _ => new List<Guid>());
        foreach (var (predecessor, successor) in links)
        {
            adjacency[predecessor].Add(successor);
            indegree[successor]++;
        }

        var queue = new Queue<Guid>(indegree.Where(kv => kv.Value == 0).Select(kv => kv.Key));
        var visited = 0;
        while (queue.Count > 0)
        {
            var node = queue.Dequeue();
            visited++;
            foreach (var next in adjacency[node])
                if (--indegree[next] == 0)
                    queue.Enqueue(next);
        }

        return visited != nodes.Count;
    }

    // === Steps (delegate to the owning operation) ===

    public Result<OperationStep> AddStep(OperationId operationId, string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return DomainError.Validation("step.title.empty", "Step title is required.");

        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        return operation.AddStep(title);
    }

    public Result UpdateStep(OperationId operationId, StepId stepId, int order, string title, string body, WorkRole? primaryBuyoffRole, WorkRole? secondaryBuyoffRole)
    {
        if (string.IsNullOrWhiteSpace(title))
            return DomainError.Validation("step.title.empty", "Step title is required.");

        var operation = Find(operationId);
        if (operation is null)
            return DomainError.NotFound("operation.not_found", $"Operation {operationId} not found.");

        return operation.UpdateStep(stepId, order, title, body, primaryBuyoffRole, secondaryBuyoffRole);
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
