import os
from celery import Celery

broker = os.environ["REDIS_URL"]
backend = os.environ["REDIS_URL"]

celery = Celery("gai", broker=broker, backend=backend)
celery.conf.timezone = "UTC"
celery.conf.beat_schedule = {
    "wake-cycle": {
        "task": "tasks.wake_cycle",
        "schedule": int(os.environ.get("WAKE_CYCLE_MIN", "5")) * 60
    }
}
