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
    type: str = Field(default="Box", description="Entity type: Box, Sphere, Web, Model")
    position: list[float] = Field(
        default=[0.0, 0.0, 0.0], description="X, Y, Z translation coordinates"
    )
    scale: list[float] = Field(default=[1.0, 1.0, 1.0], description="X, Y, Z dimensions")
    model_url: str | None = Field(
        default=None, description="GLB/FBX model resource URL if type is Model"
    )
    script_url: str | None = Field(
        default=None, description="Optional JavaScript behavior script URL to attach"
    )


class ScriptInjectInput(BaseModel):
    entity_id: str = Field(..., description="Overte target entity UUID")
    script_url: str = Field(..., description="JavaScript behavior script URL")
    script_data: dict[str, Any] = Field(
        default_factory=dict, description="Metadata parameters to inject into the script scope"
    )
