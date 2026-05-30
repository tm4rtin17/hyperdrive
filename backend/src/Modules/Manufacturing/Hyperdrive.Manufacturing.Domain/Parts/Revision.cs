using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Domain.Parts;

/// <summary>
/// Aerospace-style revision letter: A, B, C ... (skips I, O, Q, S, X, Z by convention).
/// Initial revision is "-" (dash) per ASME Y14.35 for pre-release engineering.
/// </summary>
public sealed record Revision
{
    private const string Sequence = "ABCDEFGHJKLMNPRTUVWY";

    private static readonly HashSet<char> Allowed = new(Sequence.ToCharArray());

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

    /// <summary>
    /// The next revision in sequence: "-" → A → B … (skipping I, O, Q, S, X, Z).
    /// Returns a validation error once the single-letter sequence past Y is exhausted
    /// (double-letter revisions are a future enhancement).
    /// </summary>
    public Result<Revision> Next()
    {
        if (Value == "-")
            return new Revision(Sequence[0].ToString());

        var idx = Sequence.IndexOf(Value[0]);
        if (idx < 0 || idx + 1 >= Sequence.Length)
            return DomainError.Validation(
                "revision.sequence_exhausted",
                "Revision sequence exhausted (past Y); double-letter revisions are not yet supported.");

        return new Revision(Sequence[idx + 1].ToString());
    }

    public override string ToString() => Value;
}
