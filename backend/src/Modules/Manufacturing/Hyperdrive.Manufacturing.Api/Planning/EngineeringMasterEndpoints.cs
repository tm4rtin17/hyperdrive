using Hyperdrive.Manufacturing.Application.Planning;
using Hyperdrive.Manufacturing.Domain.Planning;
using Hyperdrive.SharedKernel.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;

namespace Hyperdrive.Manufacturing.Api.Planning;

internal static class EngineeringMasterEndpoints
{
    public static RouteGroupBuilder MapEngineeringMasterEndpoints(this RouteGroupBuilder group)
    {
        // Reference data: the fixed set of buyoff roles, exposed for selection in the UI.
        group.MapGet("/work-roles", ListWorkRoles).WithName("ListWorkRoles").WithTags("Manufacturing.Planning");

        var masters = group.MapGroup("/engineering-masters").WithTags("Manufacturing.Planning");

        masters.MapGet("/", List).WithName("ListEngineeringMasters");
        masters.MapPost("/", Create).WithName("CreateEngineeringMaster");
        masters.MapGet("/{id:guid}", Get).WithName("GetEngineeringMaster");
        masters.MapPut("/{id:guid}", UpdateHeader).WithName("UpdateEngineeringMasterHeader");

        masters.MapPost("/{id:guid}/attachments",
            UploadMasterAttachment).WithName("UploadMasterAttachment").DisableAntiforgery();
        masters.MapDelete("/{id:guid}/attachments/{attachmentId:guid}",
            DeleteMasterAttachment).WithName("DeleteMasterAttachment");
        masters.MapGet("/{id:guid}/attachments/{attachmentId:guid}/file",
            DownloadMasterAttachment).WithName("DownloadMasterAttachment");

        masters.MapPost("/{id:guid}/operations", AddOperation).WithName("AddOperation");
        masters.MapPut("/{id:guid}/operations/{opId:guid}", UpdateOperation).WithName("UpdateOperation");
        masters.MapDelete("/{id:guid}/operations/{opId:guid}", RemoveOperation).WithName("RemoveOperation");

        masters.MapPut("/{id:guid}/sequence", UpdateSequence).WithName("UpdateSequence");

        masters.MapPost("/{id:guid}/operations/{opId:guid}/attachments",
            UploadOpAttachment).WithName("UploadOperationAttachment").DisableAntiforgery();
        masters.MapDelete("/{id:guid}/operations/{opId:guid}/attachments/{attachmentId:guid}",
            DeleteOpAttachment).WithName("DeleteOperationAttachment");
        masters.MapGet("/{id:guid}/operations/{opId:guid}/attachments/{attachmentId:guid}/file",
            DownloadOpAttachment).WithName("DownloadOperationAttachment");

        masters.MapPost("/{id:guid}/operations/{opId:guid}/steps", AddStep).WithName("AddStep");
        masters.MapPut("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}", UpdateStep).WithName("UpdateStep");
        masters.MapDelete("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}", RemoveStep).WithName("RemoveStep");

        // Attachment upload uses multipart/form-data — antiforgery is disabled for API clients.
        masters.MapPost("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}/attachments",
            UploadAttachment).WithName("UploadStepAttachment").DisableAntiforgery();
        masters.MapDelete("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}/attachments/{attachmentId:guid}",
            DeleteAttachment).WithName("DeleteStepAttachment");
        masters.MapGet("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}/attachments/{attachmentId:guid}/file",
            DownloadAttachment).WithName("DownloadStepAttachment");

        return group;
    }

    private static Ok<IReadOnlyList<WorkRoleDto>> ListWorkRoles() =>
        TypedResults.Ok((IReadOnlyList<WorkRoleDto>)WorkRoles.All
            .Select(r => new WorkRoleDto(r.Role.ToString(), r.Label))
            .ToList());

    private static async Task<Ok<IReadOnlyList<EngineeringMasterSummaryDto>>> List(
        string? search, int? limit, IEngineeringMasterReader reader, CancellationToken ct) =>
        TypedResults.Ok(await reader.ListAsync(search, limit ?? 50, ct));

    private static async Task<Results<Ok<EngineeringMasterDto>, NotFound>> Get(
        Guid id, IEngineeringMasterReader reader, CancellationToken ct)
    {
        var master = await reader.GetAsync(id, ct);
        return master is null ? TypedResults.NotFound() : TypedResults.Ok(master);
    }

    private static async Task<IResult> UpdateHeader(
        Guid id, UpdateMasterHeaderBody body, UpdateMasterHeaderHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(
            new UpdateMasterHeaderCommand(
                id,
                body.PartNumber,
                body.Revision ?? "A",
                body.Description ?? string.Empty,
                body.Changelog ?? string.Empty,
                body.Approvers ?? []),
            ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> UploadMasterAttachment(
        Guid id,
        IFormFile file,
        UploadMasterAttachmentHandler handler,
        CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var result = await handler.HandleAsync(
            new UploadMasterAttachmentCommand(id, file.FileName, file.ContentType, ms.ToArray()), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> DeleteMasterAttachment(
        Guid attachmentId, DeleteMasterAttachmentHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new DeleteMasterAttachmentCommand(attachmentId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> DownloadMasterAttachment(
        Guid attachmentId,
        Hyperdrive.Manufacturing.Domain.Planning.IMasterAttachmentRepository repo,
        CancellationToken ct)
    {
        var a = await repo.GetAsync(new Hyperdrive.Manufacturing.Domain.Planning.MasterAttachmentId(attachmentId), ct);
        return a is null
            ? TypedResults.NotFound()
            : Results.File(a.Data, a.ContentType, a.FileName);
    }

    private static async Task<IResult> Create(
        CreateMasterBody body, CreateEngineeringMasterHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(
            new CreateEngineeringMasterCommand(body.PartNumber, body.PartId, body.PartName), ct);
        return result.IsSuccess
            ? TypedResults.Created($"/api/manufacturing/engineering-masters/{result.Value!.Id}", result.Value)
            : ToProblem(result.Error);
    }

    private static async Task<IResult> AddOperation(
        Guid id, AddOperationBody body, AddOperationHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new AddOperationCommand(id, body.Name), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> UpdateOperation(
        Guid id, Guid opId, UpdateOperationBody body, UpdateOperationHandler handler, CancellationToken ct)
    {
        if (!TryParseRoles(body.PrimaryBuyoffRoles, out var primary, out var problem)) return problem!;
        if (!TryParseRoles(body.SecondaryBuyoffRoles, out var secondary, out problem)) return problem!;
        var result = await handler.HandleAsync(new UpdateOperationCommand(id, opId, body.Sequence, body.Name, body.Instructions ?? string.Empty, primary, secondary), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> RemoveOperation(
        Guid id, Guid opId, RemoveOperationHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new RemoveOperationCommand(id, opId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> UpdateSequence(
        Guid id, UpdateSequenceBody body, UpdateSequenceHandler handler, CancellationToken ct)
    {
        var links = (body.Links ?? [])
            .Select(l => new OperationLinkInput(l.PredecessorId, l.SuccessorId))
            .ToList();
        var result = await handler.HandleAsync(new UpdateSequenceCommand(id, links), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> AddStep(
        Guid id, Guid opId, AddStepBody body, AddStepHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new AddStepCommand(id, opId, body.Title), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> UpdateStep(
        Guid id, Guid opId, Guid stepId, UpdateStepBody body, UpdateStepHandler handler, CancellationToken ct)
    {
        if (!TryParseRoles(body.PrimaryBuyoffRoles, out var primary, out var problem)) return problem!;
        if (!TryParseRoles(body.SecondaryBuyoffRoles, out var secondary, out problem)) return problem!;
        var result = await handler.HandleAsync(new UpdateStepCommand(id, opId, stepId, body.Order, body.Title, body.Body, primary, secondary), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> RemoveStep(
        Guid id, Guid opId, Guid stepId, RemoveStepHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new RemoveStepCommand(id, opId, stepId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> UploadAttachment(
        Guid id, Guid opId, Guid stepId,
        IFormFile file,
        UploadStepAttachmentHandler handler,
        CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var result = await handler.HandleAsync(
            new UploadStepAttachmentCommand(id, opId, stepId, file.FileName, file.ContentType, ms.ToArray()), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> DeleteAttachment(
        Guid attachmentId, DeleteStepAttachmentHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new DeleteStepAttachmentCommand(attachmentId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> DownloadAttachment(
        Guid attachmentId,
        Hyperdrive.Manufacturing.Domain.Planning.IStepAttachmentRepository repo,
        CancellationToken ct)
    {
        var a = await repo.GetAsync(new Hyperdrive.Manufacturing.Domain.Planning.StepAttachmentId(attachmentId), ct);
        return a is null
            ? TypedResults.NotFound()
            : Results.File(a.Data, a.ContentType, a.FileName);
    }

    private static async Task<IResult> UploadOpAttachment(
        Guid id, Guid opId,
        IFormFile file,
        UploadOperationAttachmentHandler handler,
        CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var result = await handler.HandleAsync(
            new UploadOperationAttachmentCommand(id, opId, file.FileName, file.ContentType, ms.ToArray()), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> DeleteOpAttachment(
        Guid attachmentId, DeleteOperationAttachmentHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new DeleteOperationAttachmentCommand(attachmentId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> DownloadOpAttachment(
        Guid attachmentId,
        Hyperdrive.Manufacturing.Domain.Planning.IOperationAttachmentRepository repo,
        CancellationToken ct)
    {
        var a = await repo.GetAsync(new Hyperdrive.Manufacturing.Domain.Planning.OperationAttachmentId(attachmentId), ct);
        return a is null
            ? TypedResults.NotFound()
            : Results.File(a.Data, a.ContentType, a.FileName);
    }

    // Parses a list of work-role names. Null/empty list → empty array (unassigned).
    // Returns false with a 400 problem if any value isn't a known role.
    private static bool TryParseRoles(IReadOnlyList<string>? values, out WorkRole[] roles, out IResult? problem)
    {
        roles = [];
        problem = null;
        if (values is null || values.Count == 0) return true;
        var result = new List<WorkRole>(values.Count);
        foreach (var value in values)
        {
            if (!Enum.TryParse<WorkRole>(value, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
            {
                problem = TypedResults.Problem(detail: $"Unknown work role '{value}'.", statusCode: 400, title: "role.invalid");
                return false;
            }
            result.Add(parsed);
        }
        roles = result.ToArray();
        return true;
    }

    private static ProblemHttpResult ToProblem(DomainError error) => error.Type switch
    {
        ErrorType.Validation => TypedResults.Problem(detail: error.Message, statusCode: 400, title: error.Code),
        ErrorType.NotFound   => TypedResults.Problem(detail: error.Message, statusCode: 404, title: error.Code),
        ErrorType.Conflict   => TypedResults.Problem(detail: error.Message, statusCode: 409, title: error.Code),
        _                    => TypedResults.Problem(detail: error.Message, statusCode: 500, title: error.Code),
    };
}

internal sealed record CreateMasterBody(string PartNumber, Guid? PartId, string? PartName);
internal sealed record UpdateMasterHeaderBody(
    string PartNumber, string? Revision, string? Description, string? Changelog, IReadOnlyList<string>? Approvers);
internal sealed record AddOperationBody(string Name);
internal sealed record UpdateOperationBody(int Sequence, string Name, string Instructions, IReadOnlyList<string>? PrimaryBuyoffRoles, IReadOnlyList<string>? SecondaryBuyoffRoles);
internal sealed record OperationLinkBody(Guid PredecessorId, Guid SuccessorId);
internal sealed record UpdateSequenceBody(IReadOnlyList<OperationLinkBody> Links);
internal sealed record AddStepBody(string Title);
internal sealed record UpdateStepBody(int Order, string Title, string Body, IReadOnlyList<string>? PrimaryBuyoffRoles, IReadOnlyList<string>? SecondaryBuyoffRoles);
