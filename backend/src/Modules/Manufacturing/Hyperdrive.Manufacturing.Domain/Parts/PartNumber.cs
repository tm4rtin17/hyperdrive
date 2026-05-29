using System.Text.RegularExpressions;
using Hyperdrive.SharedKernel.Results;

namespace Hyperdrive.Manufacturing.Domain.Parts;

/// <summary>
/// Canonical part number. Uppercase, alphanumeric + hyphen, 3–32 chars.
/// Example: HD-FRAME-001, RCS-NOZ-A02.
/// </summary>
public sealed partial record PartNumber
{
    public string Value { get; }

    private PartNumber(string value) => Value = value;

    public static Result<PartNumber> Create(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return DomainError.Validation("part_number.empty", "Part number is required.");

        var normalized = raw.Trim().ToUpperInvariant();

        if (!FormatRegex().IsMatch(normalized))
            return DomainError.Validation(
                "part_number.invalid_format",
                "Part number must be 3–32 chars, A-Z 0-9 and hyphen only.");

        return new PartNumber(normalized);
    }

    public override string ToString() => Value;

    [GeneratedRegex(@"^[A-Z0-9][A-Z0-9\-]{1,30}[A-Z0-9]$")]
    private static partial Regex FormatRegex();
}
