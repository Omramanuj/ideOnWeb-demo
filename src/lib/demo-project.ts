// Demo project for testing
export const DEMO_PROJECT = {
  id: "demo-project",
  name: "Sample ADK Agent",
  description: "A sample agent for testing the editor",
  files: {
    "agent.py": `"""
Sample ADK Agent for Testing
"""

def main():
    print("🤖 ADK Agent Started!")
    print("=" * 50)
    
    # Simulate agent logic
    tasks = [
        "Analyzing data...",
        "Processing requests...",
        "Generating response...",
    ]
    
    for i, task in enumerate(tasks, 1):
        print(f"[{i}/3] {task}")
        import time
        time.sleep(0.5)
    
    print("=" * 50)
    print("✅ Agent execution completed successfully!")
    
    # Return some result
    result = {
        "status": "success",
        "tasks_completed": len(tasks),
        "message": "Agent ran successfully"
    }
    
    print(f"\\nResult: {result}")
    return result

if __name__ == "__main__":
    main()
`,
    "utils.py": `"""
Utility functions for ADK agents
"""

def format_output(data):
    """Format data for display"""
    return f"[OUTPUT] {data}"

def log(message):
    """Simple logging"""
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")
`,
    "config.json": `{
  "agent_name": "Sample ADK Agent",
  "version": "1.0.0",
  "description": "A sample agent for testing the editor",
  "author": "Test User",
  "settings": {
    "timeout": 60,
    "max_retries": 3
  }
}
`,
  },
  tree: [
    {
      name: "agent.py",
      path: "agent.py",
      type: "file" as const,
      children: [],
    },
    {
      name: "utils.py",
      path: "utils.py",
      type: "file" as const,
      children: [],
    },
    {
      name: "config.json",
      path: "config.json",
      type: "file" as const,
      children: [],
    },
  ],
};

export function getDemoProject() {
  return DEMO_PROJECT;
}

export function getDemoFileTree() {
  return {
    files: DEMO_PROJECT.files,
    tree: DEMO_PROJECT.tree,
  };
}
