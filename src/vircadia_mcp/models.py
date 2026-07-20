"""Pydantic model schemas for Vircadia MCP tools."""

from typing import Any
from pydantic import BaseModel, Field


class DomainStatusInput(BaseModel):
    host: str = Field(default="localhost", description="Vircadia domain server host")
    port: int = Field(default=40100, description="Vircadia domain administration port")


class EntitySpawnInput(BaseModel):
    name: str = Field(..., description="Name of the entity")
    type: str = Field(default="Box", description="Entity type: Box, Sphere, Web, Model")
    position: list[float] = Field(default=[0.0, 0.0, 0.0], description="X, Y, Z translation coordinates")
    scale: list[float] = Field(default=[1.0, 1.0, 1.0], description="X, Y, Z dimensions")
    model_url: str | None = Field(default=None, description="GLB/FBX model resource URL if type is Model")
    script_url: str | None = Field(default=None, description="Optional JavaScript behavior script URL to attach")


class ScriptInjectInput(BaseModel):
    entity_id: str = Field(..., description="Vircadia target entity UUID")
    script_url: str = Field(..., description="JavaScript behavior script URL")
    script_data: dict[str, Any] = Field(default_factory=dict, description="Metadata parameters to inject into the script scope")
