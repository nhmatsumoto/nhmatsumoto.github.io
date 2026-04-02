# Project Architecture

Ronaldinho-Agent follows a modern, hyper-converged architecture where a C# NeuralCore orchestrates diverse AI strategies and governance rules.

## Directory Structure

```text
Ronaldinho-Agent/
├── services/
│   ├── Ronaldinho.NeuralCore/    # .NET 9 Central Brain & API
│   ├── Ronaldinho.ConfigUI/      # React/Chakra UI Governance Interface
├── ronaldinho/                   # Core Data & Persistent State
│   ├── config/                   # SOUL.md and state definitions
│   ├── data/                     # Encryption keys and vault
├── dev_scripts/                  # PowerShell automation (Smart Onboarding)
├── docs/                         # Technical documentation
├── start_neural.ps1              # Unified Local Entry Point
└── docker-compose.yml            # Containerized Deployment (Production)
```

## Key Components

### 1. NeuralCore (The Master Brain)

A high-performance **.NET 9** engine that utilizes **Semantic Kernel** to coordinate multiple LLM strategies. It handles:

- **Provider Rotation**: Implements the **Zero-Block Resilience** chain.
- **MCP Protocol**: Multi-Agent Coordination for specialized tasks.

## ... (rest of file omitted for brevity)"
