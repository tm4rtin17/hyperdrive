using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Domain.Parts;

/// <summary>
/// Aerospace-style revision letter: A, B, C ... (skips I, O, Q, S, X, Z by convention).
/// Initial revision is "-" (dash) per ASME Y14.35 for pre-release engineering.
/// </summary>
public sealed record Revision
{
    private static readonly HashSet<char> Allowed =
        new("ABCDEFGHJKLMNPRTUVWY".ToCharArray());

    public string Value { get; }

    public static Revision Initial { get; } = new("-");

    private Revision(string value) => Value = value;

    public static Result<Revision> Create(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return DomainError.Validation("revision.empty", "Revision is required.");

        var v = raw.Trim().ToUpperInvariant();

        if (v == "-") return Initial;

        if (v.Length != 1 || !Allowed.Contains(v[0]))
            return DomainError.Validation(
                "revision.invalid",
                "Revision must be '-' or a single allowed letter (skips I, O, Q, S, X, Z).");

        return new Revision(v);
    }

    public override string ToString() => Value;
}
