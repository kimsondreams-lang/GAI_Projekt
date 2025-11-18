#!/bin/bash

set -e

# Ensure Python 3.11 is available (avoid 3.14 build issues)
if ! command -v python3.11 &>/dev/null; then
    echo "Python 3.11 not found. Installing via Homebrew..."
    brew install python@3.11
fi

# Create and activate virtual environment
if [ -d ".venv" ]; then
    CURRENT_VER=$(.venv/bin/python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' || echo "unknown")
    if [ "$CURRENT_VER" != "3.11" ]; then
        echo "Existing venv uses Python $CURRENT_VER. Recreating with Python 3.11..."
        rm -rf .venv
    fi
fi

if [ ! -d ".venv" ]; then
    PYTHON_BIN=$(command -v python3.11)
    "$PYTHON_BIN" -m venv .venv
fi
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

echo "🧪 GAI Agent System Testing"
echo "=========================="

# Definicja funkcji testowych

test_task_planning() {
    python3 <<'EOF'
import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path('.env'), override=True)

print(f"Python CWD: {os.getcwd()}")
sys.path.insert(0, '.')
print(f"Python Path: {sys.path}")

async def main():
    try:
        print("Attempting to import: from packages.core_agent.planner import add_task_sync, list_tasks_sync")
        from packages.core_agent.loop import AutonomousAgent
        from packages.core_agent.planner import add_task_sync, list_tasks_sync
        print("Import successful.")
        agent = AutonomousAgent()
        await agent.initialize()
        add_task_sync('test', 5, 0.1, {})
        tasks = list_tasks_sync()
        assert len(tasks) > 0
        print("Task planning OK")
        return True
    except Exception as e:
        import traceback
        print(f'Task planning error: {e}')
        traceback.print_exc()
        return False

if not asyncio.run(main()):
    sys.exit(1)
EOF
}

test_tools() {
    python3 <<'EOF'
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path('.env'), override=True)

sys.path.insert(0, '.')

async def main():
    try:
        from packages.models.invoke import ModelManager
        from packages.tools.content import ContentGenerator, GeneratedContent
        model_manager = ModelManager()
        content_generator = ContentGenerator(model_manager=model_manager)
        
        article = await content_generator.generate_article(
            topic="Recenzja najnowszego smartfona",
            content_type='product_review',
            target_keywords=["smartfon", "recenzja", "nowy model"],
            products=[{"name": "SuperPhone X", "asin": "B0CABC1234"}]
        )
        
        assert isinstance(article, GeneratedContent)
        print("Tools integration OK")
        
        return True
    except Exception as e:
        import traceback
        print(f"Tools integration error: {e}")
        traceback.print_exc()
        return False

if not asyncio.run(main()):
    sys.exit(1)
EOF
}

# Uruchomienie testów
test_task_planning
test_tools

echo "✅ All tests passed!"
