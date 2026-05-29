using Hyperdrive.Manufacturing.Domain.Parts.Events;
using Hyperdrive.SharedKernel.Domain;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Domain.Parts;

public sealed class Part : AggregateRoot<PartId>
{
    private readonly Dictionary<string, PartAttribute> _attributes = new(StringComparer.OrdinalIgnoreCase);

    public PartNumber PartNumber { get; private set; } = default!;
    public string Name { get; private set; } = default!;
    public Revision Revision { get; private set; } = default!;
    public PartLifecycle Lifecycle { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public IReadOnlyCollection<PartAttribute> Attributes => _attributes.Values;

    // EF
    private Part() { }

    private Part(PartId id, PartNumber number, string name, Revision revision, DateTimeOffset createdAt)
        : base(id)
    {
        PartNumber = number;
        Name = name;
        Revision = revision;
        Lifecycle = PartLifecycle.InDevelopment;
        CreatedAt = createdAt;
    }

    public static Result<Part> Create(PartNumber number, string name, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(name))
            return DomainError.Validation("part.name.empty", "Part name is required.");
        if (name.Length > 200)
            return DomainError.Validation("part.name.too_long", "Part name must be ≤ 200 chars.");

        var part = new Part(PartId.New(), number, name.Trim(), Revision.Initial, now);
        part.Raise(new PartCreatedEvent(part.Id, number.Value, part.Revision.Value));
        return part;
    }

    public Result AssignAttribute(string key, string value)
    {
        if (string.IsNullOrWhiteSpace(key))
            return DomainError.Validation("attribute.key.empty", "Attribute key is required.");
        if (key.Length > 64)
            return DomainError.Validation("attribute.key.too_long", "Attribute key must be ≤ 64 chars.");
        if (value is null)
            return DomainError.Validation("attribute.value.null", "Attribute value is required.");

        var k = key.Trim().ToLowerInvariant();
        _attributes[k] = new PartAttribute(k, value);
        Raise(new PartAttributeAssignedEvent(Id, k, value));
        return Result.Success();
    }

    public Result Release()
    {
        if (Lifecycle == PartLifecycle.Released) return Result.Success();
        if (Lifecycle == PartLifecycle.Obsolete)
            return DomainError.Conflict("part.release.obsolete", "Cannot release an obsolete part.");
        Lifecycle = PartLifecycle.Released;
        return Result.Success();
    }
}
