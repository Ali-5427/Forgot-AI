"""Dodo Payments checkout and webhook handling (test_mode by default)."""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)

PLAN_PRO = "pro"
PLAN_LIFETIME = "lifetime"
VALID_PLANS = (PLAN_PRO, PLAN_LIFETIME)
METADATA_USER_KEY = "supabase_user_id"
METADATA_PLAN_KEY = "forgot_ai_plan"

DEFAULT_BILLING = {
    "plan_type": "free",
    "status": "none",
    "current_period_end": None,
}


class CheckoutIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plan: Literal["pro", "lifetime"]


def dodo_environment() -> Literal["live_mode", "test_mode"]:
    return "live_mode" if os.getenv("DODO_PAYMENTS_ENVIRONMENT") == "live_mode" else "test_mode"


def product_id_for_plan(plan: str) -> str:
    if plan == PLAN_PRO:
        product_id = os.getenv("DODO_PRODUCT_PRO", "").strip()
    elif plan == PLAN_LIFETIME:
        product_id = os.getenv("DODO_PRODUCT_LIFETIME", "").strip()
    else:
        raise ValueError("Unknown plan")
    if not product_id:
        raise RuntimeError(f"Missing product id for plan {plan}")
    return product_id


def return_url() -> str:
    return (
        os.getenv("DODO_PAYMENTS_RETURN_URL", "").strip()
        or "http://localhost:3000/checkout/success"
    )


def lifetime_product_id() -> str:
    return os.getenv("DODO_PRODUCT_LIFETIME", "").strip()


def build_checkout_params(user: dict, plan: str) -> dict:
    product_id = product_id_for_plan(plan)
    name = (user.get("name") or "").strip() or (user.get("email") or "").split("@")[0]
    params: dict[str, Any] = {
        "product_cart": [{"product_id": product_id, "quantity": 1}],
        "customer": {
            "email": user["email"],
            "name": name,
        },
        "metadata": {
            METADATA_USER_KEY: str(user["id"]),
            METADATA_PLAN_KEY: plan,
        },
        "return_url": return_url(),
    }
    return params


def get_dodo_client():
    from dodopayments import DodoPayments

    api_key = os.getenv("DODO_PAYMENTS_API_KEY", "").strip()
    webhook_key = os.getenv("DODO_PAYMENTS_WEBHOOK_KEY", "").strip() or None
    if not api_key:
        raise RuntimeError("DODO_PAYMENTS_API_KEY is not configured")
    kwargs: dict[str, Any] = {
        "bearer_token": api_key,
        "environment": dodo_environment(),
    }
    if webhook_key:
        kwargs["webhook_key"] = webhook_key
    return DodoPayments(**kwargs)


async def create_checkout_url(user: dict, plan: str, client=None) -> str:
    params = build_checkout_params(user, plan)
    dodo = client or get_dodo_client()
    session = await asyncio.to_thread(dodo.checkout_sessions.create, **params)
    checkout_url = getattr(session, "checkout_url", None)
    if not checkout_url and isinstance(session, dict):
        checkout_url = session.get("checkout_url")
    if not checkout_url:
        raise RuntimeError("Dodo did not return a checkout_url")
    return checkout_url


def _as_dict(value: Any) -> dict:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        dumped = value.model_dump()
        return dumped if isinstance(dumped, dict) else {}
    if hasattr(value, "dict"):
        dumped = value.dict()
        return dumped if isinstance(dumped, dict) else {}
    result = {}
    for key in (
        "type",
        "data",
        "metadata",
        "customer",
        "product_id",
        "subscription_id",
        "payment_id",
        "status",
        "next_billing_date",
        "trial_period_days",
        "payload_type",
        "product_cart",
        "total_amount",
    ):
        if hasattr(value, key):
            result[key] = getattr(value, key)
    return result


def event_type_of(unwrapped: Any) -> str:
    if isinstance(unwrapped, dict):
        return str(unwrapped.get("type") or "")
    return str(getattr(unwrapped, "type", "") or "")


def event_data_of(unwrapped: Any) -> dict:
    if isinstance(unwrapped, dict):
        return _as_dict(unwrapped.get("data"))
    return _as_dict(getattr(unwrapped, "data", None))


def metadata_of(data: dict) -> dict:
    meta = _as_dict(data.get("metadata"))
    customer = _as_dict(data.get("customer"))
    if not meta:
        meta = _as_dict(customer.get("metadata"))
    return {str(k): str(v) for k, v in meta.items() if v is not None}


def user_id_from_data(data: dict) -> Optional[str]:
    meta = metadata_of(data)
    user_id = meta.get(METADATA_USER_KEY) or meta.get("app_user_id")
    return user_id.strip() if user_id else None


def product_id_from_data(data: dict) -> Optional[str]:
    if data.get("product_id"):
        return str(data["product_id"])
    cart = data.get("product_cart") or data.get("items") or []
    if isinstance(cart, list) and cart:
        first = _as_dict(cart[0])
        if first.get("product_id"):
            return str(first["product_id"])
    meta = metadata_of(data)
    if meta.get(METADATA_PLAN_KEY) == PLAN_LIFETIME:
        return lifetime_product_id() or None
    if meta.get(METADATA_PLAN_KEY) == PLAN_PRO:
        return os.getenv("DODO_PRODUCT_PRO", "").strip() or None
    return None


def parse_period_end(data: dict) -> Optional[str]:
    raw = data.get("next_billing_date") or data.get("current_period_end")
    if not raw:
        return None
    if isinstance(raw, datetime):
        if raw.tzinfo is None:
            raw = raw.replace(tzinfo=timezone.utc)
        return raw.isoformat()
    return str(raw)


def is_lifetime_row(row: Optional[dict]) -> bool:
    if not row:
        return False
    return row.get("plan_type") == "lifetime" and row.get("status") == "lifetime"


def map_subscription_status(event_type: str, data: dict) -> tuple[str, str]:
    """Return (plan_type, status) for Pro subscription events."""
    if event_type == "subscription.active":
        trial_days = data.get("trial_period_days") or 0
        try:
            trial_days = int(trial_days)
        except (TypeError, ValueError):
            trial_days = 0
        total = data.get("total_amount")
        if trial_days > 0 or total == 0:
            return "pro", "trial"
        return "pro", "active_pro"
    if event_type == "subscription.renewed":
        return "pro", "active_pro"
    if event_type == "subscription.cancelled":
        return "pro", "canceled"
    if event_type == "subscription.on_hold":
        return "pro", "on_hold"
    if event_type == "subscription.failed":
        return "pro", "failed"
    if event_type == "subscription.expired":
        return "pro", "expired"
    return "pro", "active_pro"


class InMemoryBillingStore:
    def __init__(self):
        self.subscriptions: dict[str, dict] = {}
        self.webhooks: dict[str, dict] = {}

    async def get_subscription(self, user_id: str) -> Optional[dict]:
        row = self.subscriptions.get(user_id)
        return dict(row) if row else None

    async def upsert_subscription(self, user_id: str, values: dict) -> dict:
        existing = self.subscriptions.get(user_id) or {
            "user_id": user_id,
            "plan_type": "free",
            "status": "none",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        merged = dict(existing)
        merged.update(values)
        merged["user_id"] = user_id
        merged["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.subscriptions[user_id] = merged
        return dict(merged)

    async def claim_webhook(self, webhook_id: str, event_type: str) -> str:
        existing = self.webhooks.get(webhook_id)
        if existing and existing.get("status") == "processed":
            return "duplicate"
        self.webhooks[webhook_id] = {
            "webhook_id": webhook_id,
            "event_type": event_type,
            "status": "processing",
            "received_at": datetime.now(timezone.utc).isoformat(),
        }
        return "new" if not existing else "retry"

    async def complete_webhook(self, webhook_id: str, status: str = "processed") -> None:
        row = self.webhooks.get(webhook_id) or {"webhook_id": webhook_id}
        row["status"] = status
        row["processed_at"] = datetime.now(timezone.utc).isoformat()
        self.webhooks[webhook_id] = row


class SupabaseBillingStore:
    def __init__(self, client):
        self.client = client

    async def get_subscription(self, user_id: str) -> Optional[dict]:
        def _get():
            response = (
                self.client.table("user_subscriptions")
                .select("*")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            return response.data[0] if response.data else None

        return await asyncio.to_thread(_get)

    async def upsert_subscription(self, user_id: str, values: dict) -> dict:
        def _upsert():
            payload = dict(values)
            payload["user_id"] = user_id
            payload["updated_at"] = datetime.now(timezone.utc).isoformat()
            response = (
                self.client.table("user_subscriptions")
                .upsert(payload, on_conflict="user_id")
                .execute()
            )
            if response.data:
                return response.data[0]
            return payload

        return await asyncio.to_thread(_upsert)

    async def claim_webhook(self, webhook_id: str, event_type: str) -> str:
        def _claim():
            existing = (
                self.client.table("dodo_webhook_events")
                .select("*")
                .eq("webhook_id", webhook_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                row = existing.data[0]
                if row.get("status") == "processed":
                    return "duplicate"
                return "retry"
            self.client.table("dodo_webhook_events").insert(
                {
                    "webhook_id": webhook_id,
                    "event_type": event_type,
                    "status": "processing",
                }
            ).execute()
            return "new"

        try:
            return await asyncio.to_thread(_claim)
        except Exception as exc:
            logger.warning("webhook claim conflict for %s: %s", webhook_id, exc)
            return "duplicate"

    async def complete_webhook(self, webhook_id: str, status: str = "processed") -> None:
        def _complete():
            self.client.table("dodo_webhook_events").update(
                {
                    "status": status,
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("webhook_id", webhook_id).execute()

        await asyncio.to_thread(_complete)


def billing_public_fields(row: Optional[dict]) -> dict:
    if not row:
        return dict(DEFAULT_BILLING)
    return {
        "plan_type": row.get("plan_type") or "free",
        "status": row.get("status") or "none",
        "current_period_end": row.get("current_period_end"),
    }


async def apply_entitlement(store, user_id: str, values: dict) -> dict:
    existing = await store.get_subscription(user_id)
    if is_lifetime_row(existing):
        preserved = {
            "plan_type": "lifetime",
            "status": "lifetime",
            "provider": "dodo",
        }
        if values.get("dodo_customer_id"):
            preserved["dodo_customer_id"] = values["dodo_customer_id"]
        if values.get("dodo_payment_id"):
            preserved["dodo_payment_id"] = values["dodo_payment_id"]
        return await store.upsert_subscription(user_id, preserved)
    payload = {"provider": "dodo"}
    payload.update(values)
    return await store.upsert_subscription(user_id, payload)


async def handle_verified_event(event_type: str, data: dict, store) -> str:
    user_id = user_id_from_data(data)
    if not user_id:
        logger.warning("Ignoring Dodo event %s without supabase_user_id metadata", event_type)
        return "ignored"

    customer = _as_dict(data.get("customer"))
    dodo_customer_id = customer.get("customer_id") or data.get("customer_id")
    period_end = parse_period_end(data)
    product_id = product_id_from_data(data)
    lifetime_id = lifetime_product_id()

    if event_type == "payment.succeeded":
        if product_id and lifetime_id and product_id == lifetime_id:
            await apply_entitlement(
                store,
                user_id,
                {
                    "plan_type": "lifetime",
                    "status": "lifetime",
                    "dodo_customer_id": dodo_customer_id,
                    "dodo_payment_id": data.get("payment_id"),
                    "current_period_end": None,
                },
            )
            return "applied"
        return "ignored"

    if event_type == "payment.failed":
        existing = await store.get_subscription(user_id)
        if is_lifetime_row(existing):
            return "ignored"
        if data.get("subscription_id"):
            await apply_entitlement(
                store,
                user_id,
                {
                    "plan_type": "pro",
                    "status": "on_hold",
                    "dodo_customer_id": dodo_customer_id,
                    "dodo_subscription_id": data.get("subscription_id"),
                    "dodo_payment_id": data.get("payment_id"),
                    "current_period_end": period_end,
                },
            )
            return "applied"
        return "ignored"

    if event_type in {
        "subscription.active",
        "subscription.renewed",
        "subscription.cancelled",
        "subscription.on_hold",
        "subscription.failed",
        "subscription.expired",
        "subscription.updated",
    }:
        if event_type == "subscription.updated":
            dodo_status = str(data.get("status") or "")
            status_map = {
                "active": None,
                "on_hold": "subscription.on_hold",
                "cancelled": "subscription.cancelled",
                "failed": "subscription.failed",
                "expired": "subscription.expired",
            }
            mapped_type = status_map.get(dodo_status)
            if mapped_type is None:
                trial_days = data.get("trial_period_days") or 0
                try:
                    trial_days = int(trial_days)
                except (TypeError, ValueError):
                    trial_days = 0
                mapped_type = "subscription.active" if trial_days > 0 else "subscription.renewed"
            plan_type, status = map_subscription_status(mapped_type, data)
        else:
            plan_type, status = map_subscription_status(event_type, data)
        await apply_entitlement(
            store,
            user_id,
            {
                "plan_type": plan_type,
                "status": status,
                "dodo_customer_id": dodo_customer_id,
                "dodo_subscription_id": data.get("subscription_id"),
                "current_period_end": period_end,
            },
        )
        return "applied"

    return "ignored"


def unwrap_webhook(raw_body: bytes, headers: dict, client=None):
    dodo = client or get_dodo_client()
    return dodo.webhooks.unwrap(
        raw_body,
        headers={
            "webhook-id": headers.get("webhook-id") or headers.get("Webhook-Id") or "",
            "webhook-signature": headers.get("webhook-signature") or headers.get("Webhook-Signature") or "",
            "webhook-timestamp": headers.get("webhook-timestamp") or headers.get("Webhook-Timestamp") or "",
        },
    )


async def process_dodo_webhook(raw_body: bytes, headers: dict, store, client=None) -> dict:
    webhook_id = headers.get("webhook-id") or headers.get("Webhook-Id") or ""
    if not webhook_id:
        raise ValueError("Missing webhook-id header")
    unwrapped = unwrap_webhook(raw_body, headers, client=client)
    event_type = event_type_of(unwrapped)
    data = event_data_of(unwrapped)
    claim = await store.claim_webhook(webhook_id, event_type)
    if claim == "duplicate":
        return {"received": True, "duplicate": True}
    try:
        result = await handle_verified_event(event_type, data, store)
        await store.complete_webhook(webhook_id, "processed" if result != "ignored" else "ignored")
        return {"received": True, "result": result}
    except Exception:
        await store.complete_webhook(webhook_id, "failed")
        raise


def billing_summary(billing_row: Optional[dict]) -> dict:
    """Extract public billing fields from a subscription row."""
    return billing_public_fields(billing_row)


def event_from_unwrapped(unwrapped: Any) -> tuple[str, dict]:
    """Extract event_type and data from an unwrapped webhook payload."""
    event_type = event_type_of(unwrapped)
    data = event_data_of(unwrapped)
    return event_type, data


def process_verified_webhook(store, webhook_id: str, event_type: str, data: dict) -> dict:
    """Sync wrapper for webhook processing (called via asyncio.to_thread in server.py)."""
    import asyncio
    return asyncio.run(process_dodo_webhook_sync(store, webhook_id, event_type, data))


async def process_dodo_webhook_sync(store, webhook_id: str, event_type: str, data: dict) -> dict:
    """Async implementation of webhook processing for sync wrapper."""
    claim = await store.claim_webhook(webhook_id, event_type)
    if claim == "duplicate":
        return {"received": True, "duplicate": True}
    try:
        result = await handle_verified_event(event_type, data, store)
        await store.complete_webhook(webhook_id, "processed" if result != "ignored" else "ignored")
        return {"received": True, "result": result}
    except Exception:
        await store.complete_webhook(webhook_id, "failed")
        raise
