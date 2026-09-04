import os
from types import SimpleNamespace
from typing import Any

from supabase import Client, create_client


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required configuration: {name}")
    return value


def create_supabase_client() -> Client:
    return create_client(_required("SUPABASE_URL"), _required("SUPABASE_SERVICE_ROLE_KEY"))


def _apply_filter(query, key: str, value: Any):
    if isinstance(value, dict) and "$ne" in value:
        return query.neq(key, value["$ne"])
    return query.eq(key, value)


class SupabaseCollection:
    def __init__(self, client: Client, table: str):
        self.client = client
        self.table = table

    def _query(self, filters: dict | None = None):
        query = self.client.table(self.table).select("*")
        for key, value in (filters or {}).items():
            query = _apply_filter(query, key, value)
        return query

    async def find_one(self, filters: dict):
        response = self._query(filters).limit(1).execute()
        return response.data[0] if response.data else None

    def find(self, filters: dict | None = None):
        return SupabaseFind(self, filters or {})

    async def insert_one(self, document: dict):
        response = self.client.table(self.table).insert(document).execute()
        return SimpleNamespace(inserted_id=document.get("id"), data=response.data)

    async def update_one(self, filters: dict, update: dict, upsert: bool = False):
        existing = await self.find_one(filters)
        if existing:
            values = _update_values(existing, update)
            query = self.client.table(self.table).update(values)
            for key, value in filters.items():
                query = _apply_filter(query, key, value)
            response = query.execute()
            return SimpleNamespace(modified_count=len(response.data or []), matched_count=1)
        if upsert:
            values = dict(filters)
            values.update(_update_values({}, update))
            await self.insert_one(values)
            return SimpleNamespace(modified_count=1, matched_count=0)
        return SimpleNamespace(modified_count=0, matched_count=0)

    async def update_many(self, filters: dict, update: dict):
        values = _update_values({}, update)
        query = self.client.table(self.table).update(values)
        for key, value in filters.items():
            query = _apply_filter(query, key, value)
        response = query.execute()
        count = len(response.data or [])
        return SimpleNamespace(modified_count=count)

    async def delete_one(self, filters: dict):
        query = self.client.table(self.table).delete()
        for key, value in filters.items():
            query = _apply_filter(query, key, value)
        response = query.execute()
        return SimpleNamespace(deleted_count=len(response.data or []))

    async def count_documents(self, filters: dict):
        query = self.client.table(self.table).select("id", count="exact")
        for key, value in filters.items():
            query = _apply_filter(query, key, value)
        response = query.execute()
        return response.count or 0

    async def create_index(self, *_args, **_kwargs):
        return None


class SupabaseFind:
    def __init__(self, collection: SupabaseCollection, filters: dict):
        self.collection = collection
        self.filters = filters
        self.order_column = None
        self.descending = False

    def sort(self, column: str, direction: int):
        self.order_column = column
        self.descending = direction < 0
        return self

    async def to_list(self, limit: int):
        query = self.collection._query(self.filters).limit(limit)
        if self.order_column:
            query = query.order(self.order_column, desc=self.descending)
        response = query.execute()
        return response.data or []


class SupabaseDatabase:
    def __init__(self, client: Client):
        self.users = SupabaseCollection(client, "profiles")
        self.items = SupabaseCollection(client, "items")
        self.login_attempts = SupabaseCollection(client, "login_attempts")
        self.sessions = SupabaseCollection(client, "user_sessions")


def _update_values(existing: dict, update: dict) -> dict:
    values = {}
    values.update(update.get("$set", {}))
    for key, amount in update.get("$inc", {}).items():
        values[key] = (existing.get(key, 0) or 0) + amount
    return values