"""Pydantic model schemas for Overte MCP tools.

Overte is the actively-developed fork of the original Vircadia
("High Fidelity"-derived) native client/domain-server architecture.
Vircadia itself has since pivoted to a different, PostgreSQL/Bun-based
stack ("Vircadia World") that does not share this wire protocol or
admin API. These models target the Overte/classic-Vircadia domain-server
model exclusively. See README.md "Overte vs Vircadia" section.
"""

from typing import Any

from pydantic import BaseModel, Field


class DomainStatusInput(BaseModel):
    host: str = Field(default="localhost", description="Overte domain server host")
    port: int = Field(default=40100, description="Overte domain administration port")
    username: str | None = Field(
        default=None, description="HTTP Basic Auth username for the domain-server admin API"
    )
    password: str | None = Field(
        default=None, description="HTTP Basic Auth password for the domain-server admin API"
    )


class EntitySpawnInput(BaseModel):
    name: str = Field(..., description="Name of the entity")
    type: str = Field(default="Box", description="Entity type: Box, Sphere, Web, Model, Light")
    position: list[float] = Field(
        default=[0.0, 0.0, 0.0], description="X, Y, Z translation coordinates"
    )
    scale: list[float] | None = Field(
        default=None,
        description=(
            "X, Y, Z bounding-box dimensions in meters. Omit/null to let Overte size the "
            "entity from the model's own natural dimensions - passing e.g. [1,1,1] on a "
            "non-cubic model non-uniformly stretches/squishes it to fit that box, it is not "
            "a uniform scale multiplier."
        ),
    )
    model_url: str | None = Field(
        default=None, description="GLB/FBX model resource URL if type is Model"
    )
    script_url: str | None = Field(
        default=None, description="Optional JavaScript behavior script URL to attach"
    )
    permanent: bool = Field(
        default=False,
        description="If True, sets lifetime=-1 so the entity persists across domain-server restarts.",
    )
    parent_id: str | None = Field(
        default=None,
        description=(
            "Entity/avatar UUID to parent this entity to (Overte's parentID) - position becomes "
            "relative to the parent. Pass the special ID 'MyAvatar' to attach to the local user "
            "(e.g. a headlight that follows you)."
        ),
    )
    color: list[float] = Field(
        default=[1.0, 1.0, 1.0],
        description="RGB color as 0.0-1.0 floats, default white (converted to Overte's 0-255 byte range). Used by Light/Box/Sphere; harmless no-op on Model entities, which carry their own material colors.",
    )
    intensity: float | None = Field(
        default=None, description="Light entity brightness. Only meaningful when type='Light'."
    )
    is_spotlight: bool | None = Field(
        default=None, description="True for a directional spotlight cone, False/omitted for an omnidirectional point light."
    )
    falloff_radius: float | None = Field(
        default=None, description="Distance in meters at which a Light entity's intensity falls off."
    )
    extra_properties: dict[str, Any] | None = Field(
        default=None,
        description=(
            "Escape hatch: arbitrary additional Overte entity properties, merged in verbatim "
            "(overrides the named fields above on conflict). Use for type-specific properties "
            "this schema doesn't have a dedicated field for - e.g. {'shape': 'Cylinder'} on a "
            "type='Shape' entity, or ParticleEffect fields (emitRate, alpha, textures, ...)."
        ),
    )


class EntityUpdateInput(BaseModel):
    entity_id: str = Field(..., description="Overte target entity UUID")
    position: list[float] | None = Field(default=None, description="X, Y, Z translation coordinates")
    dimensions: list[float] | None = Field(
        default=None, description="X, Y, Z bounding-box dimensions in meters (see spawn's scale note)"
    )
    parent_id: str | None = Field(default=None, description="Re-parent to a different entity/avatar UUID")
    visible: bool | None = Field(default=None, description="Show/hide without deleting - e.g. toggle a light off")
    intensity: float | None = Field(default=None, description="Light entity brightness")
    color: list[float] | None = Field(default=None, description="RGB as 0.0-1.0 floats")
    extra_properties: dict[str, Any] | None = Field(
        default=None, description="Escape hatch: arbitrary additional Overte entity properties, merged in verbatim."
    )


class EntityDeleteInput(BaseModel):
    entity_id: str = Field(..., description="Overte target entity UUID")


class EntityAnimateInput(BaseModel):
    entity_id: str = Field(..., description="Overte target entity UUID")
    mode: str = Field(
        default="spin",
        description="'spin' (continuous rotation), 'bob' (smooth sinusoidal up/down), or 'bounce' (asymmetric drop-and-rebound with energy loss per bounce - a real bounce, not a sine wave)",
    )
    axis: list[float] = Field(default=[0.0, 1.0, 0.0], description="Rotation axis for 'spin' (normalized)")
    speed: float = Field(default=1.0, description="'spin': radians/second. 'bob': oscillations/second. 'bounce': bounces/second at the start (slows as it settles)")
    amplitude: float = Field(default=0.1, description="'bob'/'bounce': peak height above the settled position, in meters")
    damping: float = Field(default=0.6, description="'bounce' only: energy retained per bounce (0-1, e.g. 0.6 = each bounce reaches 60% of the previous height)")
    duration_s: float = Field(default=5.0, description="How long to animate before stopping")
    tick_hz: float = Field(default=10.0, description="Update rate - higher is smoother but chattier over the bridge")


class FixtureSpawnInput(BaseModel):
    fixture: str = Field(
        ..., description="Preset name: box, cup, ball, table, or chair"
    )
    position: list[float] | None = Field(
        default=None,
        description="Where to place it. Omit to spawn ~1.5m in front of the local user's current facing direction.",
    )
    forward_distance: float = Field(
        default=1.5, description="Meters in front of the user when position is omitted"
    )
    name: str | None = Field(default=None, description="Override the entity name (defaults to the fixture name)")
    color: list[float] = Field(
        default=[1.0, 1.0, 1.0],
        description="RGB as 0.0-1.0 floats, default white. Applied uniformly to every part of a multi-part fixture.",
    )


class NearbyEntitiesInput(BaseModel):
    position: list[float] | None = Field(
        default=None, description="Search center. Omit to search around the local user's avatar."
    )
    radius: float = Field(default=20.0, description="Search radius in meters")


class ScriptInjectInput(BaseModel):
    entity_id: str = Field(..., description="Overte target entity UUID")
    script_url: str = Field(..., description="JavaScript behavior script URL")
    script_data: dict[str, Any] = Field(
        default_factory=dict, description="Metadata parameters to inject into the script scope"
    )
