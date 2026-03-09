from .celery_app import celery
from packages.core_agent.loop import autonomous_cycle

@celery.task(name="tasks.wake_cycle")
def wake_cycle():
    return autonomous_cycle()
