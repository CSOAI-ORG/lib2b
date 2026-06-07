import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib2b.agentcard import mcp_to_agent_card, validate


def test_required_fields_and_skill_from_tools():
    card = {"name": "io.github.CSOAI-ORG/x-mcp", "title": "X MCP", "version": "2.0.0",
            "description": "test", "tools": [{"name": "do_thing"}, {"name": "check_thing"}]}
    ac = mcp_to_agent_card(card, base_url="https://h/")
    ok, probs = validate(ac)
    assert ok, probs
    assert ac["url"] == "https://h/x-mcp/a2a"
    assert ac["version"] == "2.0.0"
    assert [s["id"] for s in ac["skills"]] == ["do_thing", "check_thing"]


def test_server_json_fallback_single_skill():
    sj = {"name": "io.github.CSOAI-ORG/dora-compliance-mcp", "version": "1.4.4",
          "description": "DORA compliance"}
    ac = mcp_to_agent_card(sj)
    ok, _ = validate(ac)
    assert ok and len(ac["skills"]) == 1 and "dora" in ac["skills"][0]["tags"]
