# Flask cria a API; jsonify retorna respostas JSON; request lê o corpo das requisições
from flask import Flask, jsonify, request
# os permite usar variáveis de ambiente no Docker Compose e Kubernetes
import os
# requests permite que este serviço consulte o Produto Service via HTTP
import requests
# psycopg2 conecta o serviço ao PostgreSQL
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

# Configurações do banco de dados recebidas por variáveis de ambiente
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "loja_db")
DB_USER = os.getenv("DB_USER", "loja_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "loja_pass")
DB_PORT = os.getenv("DB_PORT", "5432")

# Endereço do Produto Service.
# No Kubernetes, esse endereço será http://produto-service:5001.
PRODUTO_SERVICE_URL = os.getenv("PRODUTO_SERVICE_URL", "http://localhost:5001")

def conectar():
    """Abre uma conexão com o PostgreSQL."""
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )

def iniciar_banco():
    """Cria a tabela de pedidos caso ainda não exista."""
    conexao = conectar()
    cursor = conexao.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pedidos (
            id SERIAL PRIMARY KEY,
            produto_id INTEGER NOT NULL,
            produto_nome VARCHAR(120) NOT NULL,
            quantidade INTEGER NOT NULL,
            valor_unitario NUMERIC(10, 2) NOT NULL,
            valor_total NUMERIC(10, 2) NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conexao.commit()
    cursor.close()
    conexao.close()

@app.route("/", methods=["GET"])
def inicio():
    """Rota simples para testar se o serviço está em execução."""
    return jsonify({"mensagem": "Pedido Service em execução"})

@app.route("/pedidos", methods=["GET"])
def listar_pedidos():
    """Lista os pedidos gravados no banco, exibindo os mais recentes primeiro."""
    conexao = conectar()
    cursor = conexao.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT id, produto_id, produto_nome, quantidade, valor_unitario, valor_total, criado_em
        FROM pedidos
        ORDER BY id DESC;
    """)
    pedidos = cursor.fetchall()
    cursor.close()
    conexao.close()
    return jsonify(pedidos)

@app.route("/pedidos", methods=["POST"])
def criar_pedido():
    """Cria um pedido com base no produto selecionado e na quantidade informada."""
    dados = request.get_json()
    produto_id = dados.get("produto_id")
    quantidade = int(dados.get("quantidade", 1))
    
    # Validação simples para evitar pedidos sem produto ou com quantidade inválida.
    if not produto_id or quantidade <= 0:
        return jsonify({"erro": "Produto e quantidade válida são obrigatórios"}), 400
        
    # Consulta o Produto Service para confirmar se o produto existe e obter o preço.
    resposta = requests.get(f"{PRODUTO_SERVICE_URL}/produtos/{produto_id}", timeout=5)
    if resposta.status_code != 200:
        return jsonify({"erro": "Produto não encontrado"}), 404
        
    produto = resposta.json()
    valor_unitario = float(produto["preco"])
    valor_total = valor_unitario * quantidade
    
    conexao = conectar()
    cursor = conexao.cursor(cursor_factory=RealDictCursor)
    
    # Grava o pedido com uma cópia do nome e preço do produto no momento da compra.
    cursor.execute("""
        INSERT INTO pedidos (produto_id, produto_nome, quantidade, valor_unitario, valor_total)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, produto_id, produto_nome, quantidade, valor_unitario, valor_total, criado_em;
    """, (produto_id, produto["nome"], quantidade, valor_unitario, valor_total))
    
    pedido = cursor.fetchone()
    conexao.commit()
    cursor.close()
    conexao.close()
    return jsonify(pedido), 201

if __name__ == "__main__":
    # Prepara a tabela antes de abrir a API.
    iniciar_banco()
    app.run(host="0.0.0.0", port=5002)