"""Trip-plan tools — create, update, fetch a structured Plan."""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from app.models import Plan

if TYPE_CHECKING:
    from app.agent.tools import ToolContext


PLAN_DATA_DESCRIPTION = (
    "A structured trip plan. Recommended shape (omit fields you don't have):\n"
    "{\n"
    '  "summary": "short one-paragraph overview",\n'
    '  "dates": {"start": "2026-12-15", "end": "2026-12-22"},\n'
    '  "budget_estimate": {"currency": "USD", "total": 3000, "breakdown": {"flights": 1200, "lodging": 1100, "activities": 700}},\n'
    '  "flights": [{"offer_id": "off_…", "summary": "BA SFO→NRT 12/15, BA NRT→SFO 12/22"}],\n'
    '  "lodging": [{"hotel_id": "lp123", "nights": 7, "summary": "APA Ryogoku, $77/night"}],\n'
    '  "days": [\n'
    '     {"date": "2026-12-15", "items": [\n'
    '        {"time": "09:00", "kind": "activity", "title": "Senso-ji temple", "place_id": "ChIJ…", "notes": "open early to avoid crowds"}\n'
    '     ]}\n'
    "  ],\n"
    '  "open_questions": ["budget for shopping?"]\n'
    "}"
)


CREATE_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "create_plan",
        "description": (
            "Persist a new draft trip plan. Use this once you have a coherent draft "
            "that the user can react to. The user can then ask for tweaks; iterate "
            "via update_plan."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short, recognizable trip title, e.g. 'Tokyo Dec 15-22'",
                },
                "data": {
                    "type": "object",
                    "description": PLAN_DATA_DESCRIPTION,
                },
            },
            "required": ["title", "data"],
        },
    },
}


UPDATE_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "update_plan",
        "description": (
            "Update fields on an existing plan. Top-level keys in `patch` REPLACE the "
            "corresponding key on the plan. To modify nested structures (e.g. one day's "
            "items), pass the entire updated value for that top-level key. "
            "Pass title='...' to also rename, status='saved' to mark as saved."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "plan_id": {"type": "string", "description": "UUID of the plan"},
                "patch": {
                    "type": "object",
                    "description": "Partial plan data — top-level keys to replace",
                },
                "title": {"type": "string"},
                "status": {"type": "string", "enum": ["draft", "saved", "booked"]},
            },
            "required": ["plan_id"],
        },
    },
}


GET_TOOL_DEFINITION: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "get_plan",
        "description": "Fetch the current state of a plan by id.",
        "parameters": {
            "type": "object",
            "properties": {"plan_id": {"type": "string"}},
            "required": ["plan_id"],
        },
    },
}


def _serialize(plan: Plan) -> dict[str, Any]:
    return {
        "display_hint": "plan",
        "id": str(plan.id),
        "conversation_id": str(plan.conversation_id) if plan.conversation_id else None,
        "title": plan.title,
        "status": plan.status,
        "data": plan.data,
        "created_at": plan.created_at.isoformat(),
        "updated_at": plan.updated_at.isoformat(),
    }


async def create_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    title = (args.get("title") or "").strip()
    data = args.get("data") or {}
    if not title:
        return {"error": "title is required"}
    if not isinstance(data, dict):
        return {"error": "data must be an object"}
    plan = Plan(
        conversation_id=ctx.conversation_id,
        title=title[:200],
        status="draft",
        data=data,
    )
    ctx.db.add(plan)
    await ctx.db.commit()
    await ctx.db.refresh(plan)
    return _serialize(plan)


async def update_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    plan_id = (args.get("plan_id") or "").strip()
    if not plan_id:
        return {"error": "plan_id is required"}
    try:
        pid = uuid.UUID(plan_id)
    except ValueError:
        return {"error": "plan_id is not a valid UUID"}

    plan = await ctx.db.get(Plan, pid)
    if plan is None:
        return {"error": f"plan {plan_id} not found"}

    patch = args.get("patch")
    if isinstance(patch, dict) and patch:
        merged = dict(plan.data or {})
        for k, v in patch.items():
            merged[k] = v
        plan.data = merged

    if title := (args.get("title") or "").strip():
        plan.title = title[:200]
    if status := args.get("status"):
        if status not in ("draft", "saved", "booked"):
            return {"error": f"invalid status: {status}"}
        plan.status = status

    await ctx.db.commit()
    await ctx.db.refresh(plan)
    return _serialize(plan)


async def get_execute(args: dict[str, Any], ctx: "ToolContext") -> dict[str, Any]:
    plan_id = (args.get("plan_id") or "").strip()
    if not plan_id:
        return {"error": "plan_id is required"}
    try:
        pid = uuid.UUID(plan_id)
    except ValueError:
        return {"error": "plan_id is not a valid UUID"}
    plan = await ctx.db.get(Plan, pid)
    if plan is None:
        return {"error": f"plan {plan_id} not found"}
    return _serialize(plan)
