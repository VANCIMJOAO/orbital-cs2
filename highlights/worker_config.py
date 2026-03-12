"""
Configuração do worker de highlights.
Ajuste conforme seu ambiente.
"""

# G5API URL (Railway)
G5API_URL = "https://g5api-production-998f.up.railway.app"

# API key compartilhada com o G5API (deve ser a mesma do env var HIGHLIGHTS_API_KEY)
# Carrega de variável de ambiente; configure antes de rodar o worker
import os as _os
HIGHLIGHTS_API_KEY = _os.environ.get("HIGHLIGHTS_API_KEY", "")

# Intervalo de polling em segundos
POLL_INTERVAL = 30

# Número de highlights por mapa
TOP_N = 3

# Diretório temporário para demos baixados
DEMOS_DIR = "./temp_demos"

# Diretório temporário para clips gerados
CLIPS_DIR = "./temp_clips"
