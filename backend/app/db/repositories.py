from azure.cosmos.exceptions import CosmosResourceNotFoundError
from app.db.cosmos import get_container


class StudentRepository:
    def __init__(self):
        self.container = get_container("students")

    def get(self, student_id: str) -> dict | None:
        try:
            return self.container.read_item(item=student_id, partition_key=student_id)
        except CosmosResourceNotFoundError:
            return None

    def get_by_email(self, email: str) -> dict | None:
        """Cross-partition query — only used on auth endpoints, never on quiz hot path."""
        items = list(self.container.query_items(
            query="SELECT * FROM c WHERE c.email = @email",
            parameters=[{"name": "@email", "value": email}],
            enable_cross_partition_query=True,
        ))
        return items[0] if items else None

    def upsert(self, student: dict) -> dict:
        return self.container.upsert_item(body=student)


class SessionRepository:
    def __init__(self):
        self.container = get_container("sessions")

    def get(self, session_id: str, student_id: str) -> dict | None:
        try:
            return self.container.read_item(item=session_id, partition_key=student_id)
        except CosmosResourceNotFoundError:
            return None

    def upsert(self, session: dict) -> dict:
        return self.container.upsert_item(body=session)


class InsightsRepository:
    def __init__(self):
        self.container = get_container("insights")

    def get(self, insights_id: str, student_id: str) -> dict | None:
        try:
            return self.container.read_item(item=insights_id, partition_key=student_id)
        except CosmosResourceNotFoundError:
            return None

    def get_all_for_student(self, student_id: str) -> list[dict]:
        return list(self.container.query_items(
            query="SELECT * FROM c WHERE c.student_id = @sid",
            parameters=[{"name": "@sid", "value": student_id}],
            enable_cross_partition_query=False,
        ))

    def upsert(self, insights: dict) -> dict:
        return self.container.upsert_item(body=insights)
