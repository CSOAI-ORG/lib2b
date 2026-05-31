// Package lib2b provides the protocol layer for B2B AI.
// Unified SDK for MCP, A2A, ACP, libp2p, and ABCI.
package lib2b

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Config holds the lib2b client configuration.
type Config struct {
	APIKey    string
	BaseURL   string
	Protocols []string
	Timeout   time.Duration
	HTTPClient *http.Client
}

// Client is the main lib2b client.
type Client struct {
	Config Config
	MCP    *MCPClient
	A2A    *A2AClient
	ACP    *ACPClient
}

// Error represents a lib2b error.
type Error struct {
	Message  string
	Code     string
	Protocol string
}

func (e *Error) Error() string {
	return fmt.Sprintf("lib2b [%s]: %s", e.Code, e.Message)
}

// New creates a new lib2b client.
func New(cfg Config) (*Client, error) {
	if cfg.APIKey == "" {
		cfg.APIKey = os.Getenv("CSOAI_API_KEY")
	}
	if cfg.APIKey == "" {
		return nil, &Error{Message: "API key is required", Code: "MISSING_API_KEY"}
	}
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.csoai.org"
	}
	if len(cfg.Protocols) == 0 {
		cfg.Protocols = []string{"mcp", "a2a", "acp"}
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 30 * time.Second
	}
	if cfg.HTTPClient == nil {
		cfg.HTTPClient = &http.Client{Timeout: cfg.Timeout}
	}

	client := &Client{Config: cfg}
	client.MCP = &MCPClient{client: client}
	client.A2A = &A2AClient{client: client}
	client.ACP = &ACPClient{client: client}
	return client, nil
}

func (c *Client) request(method, endpoint string, body interface{}) (map[string]interface{}, error) {
	url := c.Config.BaseURL + endpoint
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.Config.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Config.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, &Error{
			Message:  fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(bodyBytes)),
			Code:     fmt.Sprintf("HTTP_%d", resp.StatusCode),
		}
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// MCPClient provides Model Context Protocol operations.
type MCPClient struct {
	client *Client
}

// Discover returns available MCP tools.
func (m *MCPClient) Discover(serverName string) ([]map[string]interface{}, error) {
	endpoint := "/mcp/tools"
	if serverName != "" {
		endpoint += "?server=" + serverName
	}
	res, err := m.client.request("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	if tools, ok := res["tools"].([]interface{}); ok {
		result := make([]map[string]interface{}, len(tools))
		for i, t := range tools {
			result[i] = t.(map[string]interface{})
		}
		return result, nil
	}
	return nil, nil
}

// Invoke calls an MCP tool.
func (m *MCPClient) Invoke(toolName string, params map[string]interface{}) (map[string]interface{}, error) {
	return m.client.request("POST", "/mcp/invoke", map[string]interface{}{
		"tool":   toolName,
		"params": params,
	})
}

// A2AClient provides Agent-to-Agent protocol operations.
type A2AClient struct {
	client *Client
}

// Delegate sends a task to a council of agents.
func (a *A2AClient) Delegate(agents []string, task, consensus string) (map[string]interface{}, error) {
	return a.client.request("POST", "/a2a/delegate", map[string]interface{}{
		"agents":    agents,
		"task":      task,
		"consensus": consensus,
	})
}

// ACPClient provides Agent Communication Protocol operations.
type ACPClient struct {
	client *Client
}

// CreateSession creates a new ACP session.
func (a *ACPClient) CreateSession(options map[string]interface{}) (string, error) {
	res, err := a.client.request("POST", "/acp/sessions", options)
	if err != nil {
		return "", err
	}
	if id, ok := res["sessionId"].(string); ok {
		return id, nil
	}
	return "", &Error{Message: "sessionId not returned", Code: "INVALID_RESPONSE"}
}
