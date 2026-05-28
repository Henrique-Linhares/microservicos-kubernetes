# Importa recursos do Flask para criar rotas, retornar JSON e ler dados enviados pelo frontend
from flask import Flask, jsonify, request
# Importa os para ler variáveis de ambiente, usadas no Docker Compose e Kubernetes
import os
# Biblioteca usada para conectar a aplicação Python ao PostgreSQL
import psycopg2
from psycopg2.extras import RealDictCursor

# Cria a aplicação Flask
app = Flask(__name__)

# Lê as configurações do banco por variáveis de ambiente.
# Se a variável não existir, usa o valor padrão informado no segundo parâmetro.
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "loja_db")
DB_USER = os.getenv("DB_USER", "loja_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "loja_pass")
DB_PORT = os.getenv("DB_PORT", "5432")

def conectar():
    """Abre uma conexão com o banco PostgreSQL."""
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )

def iniciar_banco():
    """Cria a tabela de produtos caso ela ainda não exista e insere dados iniciais."""
    conexao = conectar()
    cursor = conexao.cursor()

    # Cria a tabela produtos apenas se ela ainda não existir.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(120) NOT NULL,
            descricao TEXT,
            preco NUMERIC(10, 2) NOT NULL,
            estoque INTEGER NOT NULL DEFAULT 0
        );
    """)
    
    # Verifica se já existem produtos cadastrados.
    cursor.execute("SELECT COUNT(*) FROM produtos;")
    total = cursor.fetchone()[0]
    
    # Insere produtos iniciais apenas se a tabela estiver vazia.
    if total == 0:
        cursor.execute("""
            INSERT INTO produtos (nome, descricao, preco, estoque) VALUES
            ('Sensor Industrial', 'Sensor utilizado em processos de automação', 120.00, 15),
            ('Motor Elétrico', 'Motor elétrico trifásico para aplicações industriais', 850.00, 8),
            ('CLP Compacto', 'Controlador lógico programável compacto', 1500.00, 5);
        """)
        
    # Confirma as alterações no banco e fecha a conexão.
    conexao.commit()
    cursor.close()
    conexao.close()

@app.route("/", methods=["GET"])
def inicio():
    """Rota simples para verificar se o serviço está em execução."""
    return jsonify({"mensagem": "Produto Service em execução"})

@app.route("/produtos", methods=["GET"])
def listar_produtos():
    """Lista todos os produtos cadastrados no banco."""
    conexao = conectar()
    cursor = conexao.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id, nome, descricao, preco, estoque FROM produtos ORDER BY id;")
    produtos = cursor.fetchall()
    cursor.close()
    conexao.close()
    return jsonify(produtos)

@app.route("/produtos", methods=["POST"])
def cadastrar_produto():
    """Recebe dados em JSON e cadastra um novo produto."""
    dados = request.get_json()
    nome = dados.get("nome")
    descricao = dados.get("descricao", "")
    preco = dados.get("preco")
    estoque = dados.get("estoque", 0)

    # Validação simples dos campos obrigatórios.
    if not nome or preco is None:
        return jsonify({"erro": "Nome e preço são obrigatórios"}), 400
        
    conexao = conectar()
    cursor = conexao.cursor(cursor_factory=RealDictCursor)
    
    # Usa parâmetros (%s) para evitar montagem direta de SQL com dados do usuário.
    cursor.execute("""
        INSERT INTO produtos (nome, descricao, preco, estoque)
        VALUES (%s, %s, %s, %s)
        RETURNING id, nome, descricao, preco, estoque;
    """, (nome, descricao, preco, estoque))
    
    produto = cursor.fetchone()
    conexao.commit()
    cursor.close()
    conexao.close()
    return jsonify(produto), 201

@app.route("/produtos/<int:id_produto>", methods=["GET"])
def buscar_produto(id_produto):
    """Busca um produto pelo ID informado na URL."""
    conexao = conectar()
    cursor = conexao.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        "SELECT id, nome, descricao, preco, estoque FROM produtos WHERE id = %s;",
        (id_produto,)
    )
    produto = cursor.fetchone()
    cursor.close()
    conexao.close()
    
    if produto:
        return jsonify(produto)
    return jsonify({"erro": "Produto não encontrado"}), 404

if __name__ == "__main__":
    # Ao iniciar o contêiner, prepara a tabela antes de abrir o servidor Flask.
    iniciar_banco()
    app.run(host="0.0.0.0", port=5001)