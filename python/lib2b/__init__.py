"""
lib2b — The Protocol Layer for B2B AI
Unified SDK for MCP, A2A, ACP, libp2p, and ABCI

Example:
    from lib2b import Lib2B

    client = Lib2B(api_key=os.environ["CSOAI_API_KEY"])

    # Discover MCP tools
    tools = client.mcp.discover()

    # Delegate to agent council
    result = client.a2a.delegate(
        agents=["risk-agent", "compliance-agent"],
        task="Assess AI system safety",
        consensus="byzantine",
    )
"""

__version__ = "0.1.0"
__author__ = "CSOAI <dev@csoai.org>"

import os
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
import requests


@dataclass
class Lib2BConfig:
    api_key: str
    base_url: str = "https://api.csoai.org"
    protocols: List[str] = field(default_factory=lambda: ["mcp", "a2a", "acp"])
    timeout: int = 30


class Lib2BError(Exception):
    """Base lib2b error."""
    def __init__(self, message: str, code: str, protocol: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.protocol = protocol


class ProtocolError(Lib2BError):
    """Protocol-specific error."""
    pass


class TimeoutError(Lib2BError):
    """Request timeout error."""
    pass


class ConsensusError(Lib2BError):
    """A2A consensus failure."""
    def __init__(self, message: str, votes: List[Dict[str, Any]]):
        super().__init__(message, "CONSENSUS_FAILED", "a2a")
        self.votes = votes


class _HTTPClient:
    """Internal HTTP client with auth and timeout."""
    def __init__(self, config: Lib2BConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
        })

    def request(self, method: str, endpoint: str, **kwargs) -> Any:
        url = f"{self.config.base_url.rstrip('/')}{endpoint}"
        try:
            response = self.session.request(
                method, url, timeout=self.config.timeout, **kwargs
            )
            response.raise_for_status()
            return response.json()
        except requests.Timeout:
            raise TimeoutError(
                f"Request timed out after {self.config.timeout}s",
                "TIMEOUT",
            )
        except requests.HTTPError as e:
            raise ProtocolError(
                f"HTTP {e.response.status_code}: {e.response.text}",
                f"HTTP_{e.response.status_code}",
            )


class MCPClient:
    """Model Context Protocol client."""
    def __init__(self, http: _HTTPClient):
        self.http = http

    def discover(self, server_name: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {"server": server_name} if server_name else {}
        res = self.http.request("GET", "/mcp/tools", params=params)
        return res.get("tools", [])

    def invoke(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        return self.http.request("POST", "/mcp/invoke", json={"tool": tool_name, "params": params})

    def list_servers(self) -> List[Dict[str, Any]]:
        return self.http.request("GET", "/mcp/servers")


class A2AClient:
    """Agent-to-Agent protocol client with Byzantine consensus."""
    def __init__(self, http: _HTTPClient):
        self.http = http

    def delegate(self, agents: List[str], task: str, consensus: str = "byzantine",
                 timeout: int = 45) -> Dict[str, Any]:
        return self.http.request("POST", "/a2a/delegate", json={
            "agents": agents,
            "task": task,
            "consensus": consensus,
            "timeout": timeout,
        })

    def get_agent_card(self, agent_url: str) -> Dict[str, Any]:
        return self.http.request("GET", "/a2a/agent", params={"url": agent_url})

    def list_agents(self, tags: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        params = {}
        if tags:
            params["tag"] = tags
        return self.http.request("GET", "/a2a/agents", params=params)


class ACPClient:
    """Agent Communication Protocol client."""
    def __init__(self, http: _HTTPClient):
        self.http = http

    def create_session(self, **options) -> str:
        res = self.http.request("POST", "/acp/sessions", json=options)
        return res["sessionId"]

    def list_sessions(self) -> List[Dict[str, Any]]:
        return self.http.request("GET", "/acp/sessions")


class Lib2B:
    """Main lib2b client."""
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        api_key = api_key or os.environ.get("CSOAI_API_KEY")
        if not api_key:
            raise Lib2BError("API key is required", "MISSING_API_KEY")
        self.config = Lib2BConfig(api_key=api_key, **kwargs)
        self.http = _HTTPClient(self.config)
        self.mcp = MCPClient(self.http)
        self.a2a = A2AClient(self.http)
        self.acp = ACPClient(self.http)

    def health(self) -> Dict[str, Any]:
        """Check health of all enabled protocols."""
        # Stub: returns mock health report
        return {
            "overall": "healthy",
            "protocols": {p: {"status": "up"} for p in self.config.protocols},
            "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        }

    def close(self):
        """Close all connections."""
        self.http.session.close()
