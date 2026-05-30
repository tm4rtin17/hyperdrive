using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Domain.Parts;

/// <summary>
/// The traceability/serialization policy for a part: how its units are tracked and,
/// for serial-tracked parts, how serials are assigned and formatted. Stored as an
/// owned value object on <see cref="Part"/>. This captures intent — actual lot/serial
/// minting happens in inventory / work-order execution.
/// </summary>
public sealed class Traceability
{
    public TraceabilityType Type { get; private set; }
    public SerialAssignment? Assignment { get; private set; }
    public string? SerialFormat { get; private set; }

    // EF
    private Traceability() { }

    private Traceability(TraceabilityType type, SerialAssignment? assignment, string? serialFormat)
    {
        Type = type;
        Assignment = assignment;
        SerialFormat = serialFormat;
    }

    /// <summary>Default policy: not individually tracked.</summary>
    public static Traceability None() => new(TraceabilityType.None, null, null);

    public static Result<Traceability> Create(
        TraceabilityType type,
        SerialAssignment? assignment,
        string? serialFormat)
    {
        if (type != TraceabilityType.Serial)
            // None / Lot carry no serial assignment or format.
            return new Traceability(type, null, null);

        if (assignment is null)
            return DomainError.Validation(
                "traceability.assignment.required",
                "Serial-tracked parts require a serial assignment method (Manual or Auto).");

        var format = string.IsNullOrWhiteSpace(serialFormat) ? null : serialFormat.Trim();
        if (format is { Length: > 64 })
            return DomainError.Validation(
                "traceability.format.too_long",
                "Serial format must be ≤ 64 chars.");

        return new Traceability(type, assignment, format);
    }
}
