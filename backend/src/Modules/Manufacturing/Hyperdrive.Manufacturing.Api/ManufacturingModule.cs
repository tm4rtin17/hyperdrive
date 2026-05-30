using Hyperdrive.Manufacturing.Api.Lifecycle;
using Hyperdrive.Manufacturing.Api.Parts;
using Hyperdrive.Manufacturing.Application.Lifecycle;
using Hyperdrive.Manufacturing.Application.Parts;
using Hyperdrive.Manufacturing.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Hyperdrive.Manufacturing.Api;

public static class ManufacturingModule
{
    public static IServiceCollection AddManufacturingModule(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddManufacturingInfrastructure(connectionString);

        services.AddScoped<CreatePartHandler>();
        services.AddScoped<UpdatePartHandler>();
        services.AddScoped<DeletePartHandler>();

        services.AddScoped<ReleaseRevisionHandler>();
        services.AddScoped<ObsoleteRevisionHandler>();
        services.AddScoped<CreateNextRevisionHandler>();
        services.AddScoped<AddBomLineHandler>();
        services.AddScoped<UpdateBomLineHandler>();
        services.AddScoped<RemoveBomLineHandler>();

        return services;
    }

    public static IEndpointRouteBuilder MapManufacturingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/manufacturing");

        group.MapPartEndpoints();
        group.MapLifecycleEndpoints();

        return app;
    }
}
