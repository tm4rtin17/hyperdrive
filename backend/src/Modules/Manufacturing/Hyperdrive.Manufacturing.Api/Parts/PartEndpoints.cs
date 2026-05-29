using Hyperdrive.Manufacturing.Application.Parts;
using Hyperdrive.SharedKernel.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;

namespace Hyperdrive.Manufacturing.Api.Parts;

internal static class PartEndpoints
{
    public static RouteGroupBuilder MapPartEndpoints(this RouteGroupBuilder group)
    {
        var parts = group.MapGroup("/parts").WithTags("Manufacturing.Parts");

        parts.MapGet("/", ListParts).WithName("ListParts");
        parts.MapGet("/{id:guid}", GetPart).WithName("GetPart");
        parts.MapPost("/", CreatePart).WithName("CreatePart");
        parts.MapPost("/{id:guid}/attributes", AssignAttribute).WithName("AssignPartAttribute");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<PartSummaryDto>>> ListParts(
        string? search,
        int? limit,
        IPartReader reader,
        CancellationToken ct) =>
        TypedResults.Ok(await reader.ListAsync(search, limit ?? 50, ct));

    private static async Task<Results<Ok<PartDto>, NotFound>> GetPart(
        Guid id,
        IPartReader reader,
        CancellationToken ct)
    {
        var part = await reader.GetAsync(id, ct);
        return part is null ? TypedResults.NotFound() : TypedResults.Ok(part);
    }

    private static async Task<IResult> CreatePart(
        CreatePartCommand command,
        CreatePartHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(command, ct);
        return result.IsSuccess
            ? TypedResults.Created($"/api/manufacturing/parts/{result.Value!.Id}", result.Value)
            : ToProblem(result.Error);
    }

    private static async Task<IResult> AssignAttribute(
        Guid id,
        AssignAttributeBody body,
        AssignAttributeHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(new AssignAttributeCommand(id, body.Key, body.Value), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static Microsoft.AspNetCore.Http.HttpResults.ProblemHttpResult ToProblem(DomainError error) => error.Type switch
    {
        ErrorType.Validation => TypedResults.Problem(detail: error.Message, statusCode: 400, title: error.Code),
        ErrorType.NotFound   => TypedResults.Problem(detail: error.Message, statusCode: 404, title: error.Code),
        ErrorType.Conflict   => TypedResults.Problem(detail: error.Message, statusCode: 409, title: error.Code),
        _                    => TypedResults.Problem(detail: error.Message, statusCode: 500, title: error.Code),
    };
}

internal sealed record AssignAttributeBody(string Key, string Value);
