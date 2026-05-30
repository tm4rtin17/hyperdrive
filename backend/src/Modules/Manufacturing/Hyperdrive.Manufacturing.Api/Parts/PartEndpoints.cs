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
        parts.MapGet("/by-number/{partNumber}", GetPartByNumber).WithName("GetPartByNumber");
        parts.MapGet("/{id:guid}", GetPart).WithName("GetPart");
        parts.MapPost("/", CreatePart).WithName("CreatePart");
        parts.MapPut("/{id:guid}", UpdatePart).WithName("UpdatePart");
        parts.MapDelete("/{id:guid}", DeletePart).WithName("DeletePart");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<PartSummaryDto>>> ListParts(
        string? search,
        int? limit,
        bool? includeArchived,
        IPartReader reader,
        CancellationToken ct) =>
        TypedResults.Ok(await reader.ListAsync(search, limit ?? 50, includeArchived ?? false, ct));

    private static async Task<Results<Ok<PartDto>, NotFound>> GetPart(
        Guid id,
        IPartReader reader,
        CancellationToken ct)
    {
        var part = await reader.GetAsync(id, ct);
        return part is null ? TypedResults.NotFound() : TypedResults.Ok(part);
    }

    private static async Task<Results<Ok<PartDto>, NotFound>> GetPartByNumber(
        string partNumber,
        IPartReader reader,
        CancellationToken ct)
    {
        var part = await reader.GetByNumberAsync(partNumber, ct);
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

    private static async Task<IResult> UpdatePart(
        Guid id,
        UpdatePartBody body,
        UpdatePartHandler handler,
        CancellationToken ct)
    {
        var command = new UpdatePartCommand(
            id, body.PartType, body.UnitOfMeasure, body.Sourcing, body.Material, body.MassGrams,
            body.TraceabilityType, body.SerialAssignment, body.SerialFormat);
        var result = await handler.HandleAsync(command, ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> DeletePart(
        Guid id,
        DeletePartHandler handler,
        CancellationToken ct)
    {
        var result = await handler.HandleAsync(new DeletePartCommand(id), ct);
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

internal sealed record UpdatePartBody(
    string PartType,
    string UnitOfMeasure,
    string Sourcing,
    string? Material,
    decimal? MassGrams,
    string TraceabilityType,
    string? SerialAssignment,
    string? SerialFormat);
