using Hyperdrive.Engineering.Api.Lifecycle;
using Hyperdrive.Engineering.Api.Parts;
using Hyperdrive.Engineering.Application.Lifecycle;
using Hyperdrive.Engineering.Application.Parts;
using Hyperdrive.Engineering.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Hyperdrive.Engineering.Api;

public static class EngineeringModule
{
    public static IServiceCollection AddEngineeringModule(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddEngineeringInfrastructure(connectionString);

        services.AddScoped<CreatePartHandler>();
        services.AddScoped<UpdatePartHandler>();
        services.AddScoped<DeletePartHandler>();
        services.AddScoped<RestorePartHandler>();

        services.AddScoped<ReleaseRevisionHandler>();
        services.AddScoped<ObsoleteRevisionHandler>();
        services.AddScoped<RestoreRevisionHandler>();
        services.AddScoped<CreateNextRevisionHandler>();
        services.AddScoped<AddBomLineHandler>();
        services.AddScoped<UpdateBomLineHandler>();
        services.AddScoped<RemoveBomLineHandler>();

        return services;
    }

    public static IEndpointRouteBuilder MapEngineeringEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/engineering");

        group.MapPartEndpoints();
        group.MapLifecycleEndpoints();

        return app;
    }
}
