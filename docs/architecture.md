# Arquitetura do Sistema

O Ronaldinho-Agent segue uma arquitetura moderna e bastante integrada, na qual um `NeuralCore` em C# orquestra estratégias de IA e regras de governança.

## Estrutura de diretórios

```text
Ronaldinho-Agent/
├── services/
│   ├── Ronaldinho.NeuralCore/    # Cérebro central e API em .NET 9
│   ├── Ronaldinho.ConfigUI/      # Interface de governança em React/Chakra UI
├── ronaldinho/                   # Dados centrais e estado persistente
│   ├── config/                   # SOUL.md e definições de estado
│   ├── data/                     # Chaves de criptografia e vault
├── dev_scripts/                  # Automação em PowerShell
├── docs/                         # Documentação técnica
├── start_neural.ps1              # Ponto de entrada local unificado
└── docker-compose.yml            # Deploy containerizado
```

## Componentes principais

### 1. NeuralCore

Um motor de alta performance em **.NET 9** que usa **Semantic Kernel** para coordenar múltiplas estratégias de LLM e regras de governança.

Responsabilidades centrais:

- **Rotação de providers** com cadeia de resiliência para falhas e limites de cota
- **Suporte ao protocolo MCP** para coordenação entre agentes especializados
- **Compressão de contexto** para sessões longas
- **APIs operacionais** para integração com interfaces externas

### 2. Config UI

Uma superfície de governança para ajustar regras operacionais, prioridades de provider e comportamento de runtime sem alterar o núcleo do agente.

### 3. Estado persistente

Configuração, memória e material sensível ficam fora do código dos serviços para que o runtime possa reiniciar sem perder identidade ou contexto.
