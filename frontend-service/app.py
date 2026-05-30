# Flask serve a página HTML e cria rotas internas para o frontend consumir
from flask import Flask, render_template, jsonify, request
# os permite ler variáveis de ambiente definidas no Docker Compose ou Kubernetes
import os
# requests faz chamadas HTTP para os outros microserviços
import requests

app = Flask(__name__)

PRODUTO_SERVICE_URL = os.getenv("PRODUTO_SERVICE_URL", "http://localhost:5001")
PEDIDO_SERVICE_URL = os.getenv("PEDIDO_SERVICE_URL", "http://localhost:5002")

@app.route("/")
def index():
    """Carrega a página principal do sistema."""
    return render_template("index.html")

@app.route("/pedidos")
def pedidos_page():
    """Carrega a página de gerenciamento de pedidos."""
    return render_template("pedidos.html")

@app.route("/api/produtos", methods=["GET"])
def listar_produtos():
    """Rota intermediária: o navegador chama o frontend, e o frontend chama o Produto Service."""
    resposta = requests.get(f"{PRODUTO_SERVICE_URL}/produtos", timeout=5)
    return jsonify(resposta.json()), resposta.status_code

@app.route("/api/produtos", methods=["POST"])
def cadastrar_produto():
    """Recebe o produto do navegador e repassa para o Produto Service."""
    resposta = requests.post(
        f"{PRODUTO_SERVICE_URL}/produtos",
        json=request.get_json(),
        timeout=5
    )
    return jsonify(resposta.json()), resposta.status_code

@app.route("/api/pedidos", methods=["GET"])
def listar_pedidos():
    """Consulta o Pedido Service e retorna os pedidos para o navegador."""
    resposta = requests.get(f"{PEDIDO_SERVICE_URL}/pedidos", timeout=5)
    return jsonify(resposta.json()), resposta.status_code

@app.route("/api/pedidos", methods=["POST"])
def criar_pedido():
    """Recebe o pedido do navegador e repassa para o Pedido Service."""
    resposta = requests.post(
        f"{PEDIDO_SERVICE_URL}/pedidos",
        json=request.get_json(),
        timeout=5
    )
    return jsonify(resposta.json()), resposta.status_code

if __name__ == "__main__":
    # host 0.0.0.0 permite que a aplicação seja acessada de fora do contêiner.
    app.run(host="0.0.0.0", port=5000)