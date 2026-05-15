# 🎨 OfficeBot Image Generator

Script para gerar imagens promocionais usando a API da MiniMax.

## Imagens geradas

| Nome | Aspect Ratio | Descrição |
|---|---|---|
| `logo.png` | 1:1 | Ícone do app (robot com gravata) |
| `banner.png` | 16:9 | Banner para redes sociais |
| `hero.png` | 16:9 | Ilustração hero do produto |
| `icon-agent.png` | 1:1 | Ícone: agente AI |
| `icon-channels.png` | 1:1 | Ícone: canais de mensageria |
| `icon-team.png` | 1:1 | Ícone: colaboração em equipe |
| `icon-extensions.png` | 1:1 | Ícone: sistema de extensões |
| `icon-database.png` | 1:1 | Ícone: banco de dados |
| `icon-security.png` | 1:1 | Ícone: segurança |

## Setup

### 1. Instalar dependências

```bash
pip install requests
```

### 2. Configurar API Key

**Opção A**: Variável de ambiente
```bash
export MINIMAX_API_KEY="your-api-key-here"
```

**Opção B**: Arquivo `.env.json` (não commitar!)
```bash
echo '{"MINIMAX_API_KEY": "your-api-key-here"}' > .env.json
```

### 3. Gerar imagens

```bash
# Gerar todas as imagens
python scripts/generate-images.py --all

# Gerar apenas logo
python scripts/generate-images.py --logo

# Gerar apenas ícones
python scripts/generate-images.py --icons

# Listar imagens disponíveis
python scripts/generate-images.py --list
```

## Output

Imagens são salvas em `assets/`:
```
assets/
├── logo.png
├── banner.png
├── hero.png
├── icon-agent.png
├── icon-channels.png
├── icon-team.png
├── icon-extensions.png
├── icon-database.png
└── icon-security.png
```

## Notas

- ⚠️ **Não commite** o `.env.json` com sua API key
- 📝 As prompts são otimizadas para o estilo MiniMax
- ⏱️ Pode levar 30-60s por imagem dependendo da fila
- 🖼️ Formato de saída: PNG (base64 decoded)