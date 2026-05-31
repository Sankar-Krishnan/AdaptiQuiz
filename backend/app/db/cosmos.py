import urllib3
from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.exceptions import CosmosHttpResponseError
from app.config import settings

_client: CosmosClient | None = None


def get_cosmos_client() -> CosmosClient:
    global _client
    if _client is None:
        if settings.disable_ssl_verify:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        _client = CosmosClient(
            url=settings.cosmos_endpoint,
            credential=settings.cosmos_key,
            connection_verify=not settings.disable_ssl_verify,
        )
    return _client


def get_database():
    return get_cosmos_client().get_database_client(settings.cosmos_database)


def get_container(container_name: str):
    return get_database().get_container_client(container_name)


def setup_cosmos() -> None:
    """Create the database and containers if they don't exist. Called at app startup."""
    try:
        client = get_cosmos_client()
        db = client.create_database_if_not_exists(id=settings.cosmos_database)

        containers = [
            {"id": "students", "partition_key": "/student_id"},
            {"id": "sessions", "partition_key": "/student_id"},
            {"id": "insights", "partition_key": "/student_id"},
        ]
        for cfg in containers:
            db.create_container_if_not_exists(
                id=cfg["id"],
                partition_key=PartitionKey(path=cfg["partition_key"]),
            )
    except CosmosHttpResponseError as e:
        print(f"[cosmos] setup failed — is the emulator running? {e.message}")
    except Exception as e:
        print(f"[cosmos] setup failed: {e}")
