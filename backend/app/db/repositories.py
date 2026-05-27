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
