const listaProdutos = document.getElementById("listaProdutos");
const listaPedidos = document.getElementById("listaPedidos");
const selectProduto = document.getElementById("produto_id");
const formProduto = document.getElementById("formProduto");
const formPedido = document.getElementById("formPedido");
const modal = document.getElementById("productModal");
const closeModal = document.querySelector(".close-modal");
const modalNome = document.getElementById("modalNome");
const modalDescricao = document.getElementById("modalDescricao");
const modalPreco = document.getElementById("modalPreco");
const modalEstoque = document.getElementById("modalEstoque");

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function abrirDetalhesProduto(produto) {
    if (!modal) return;
    modalNome.innerText = produto.nome;
    modalDescricao.innerText = produto.descricao || "Sem descrição disponível.";
    modalPreco.innerText = formatarMoeda(produto.preco);
    modalEstoque.innerText = produto.estoque;
    modal.style.display = "flex";
}

if (closeModal) {
    closeModal.onclick = () => modal.style.display = "none";
}

window.onclick = (evento) => {
    if (modal && evento.target === modal) {
        modal.style.display = "none";
    }
};

async function carregarProdutos() {
    try {
        const resposta = await fetch("/api/produtos");
        const produtos = await resposta.json();
        
        if (listaProdutos) {
            listaProdutos.innerHTML = "";
            produtos.forEach(produto => {
                const item = document.createElement("div");
                item.className = "item";
                item.style.cursor = "pointer"; 
                
                item.innerHTML = `
                    <strong>${produto.nome}</strong>
                    <span>${produto.descricao || "Sem descrição"}</span><br>
                    <span>Preço: ${formatarMoeda(produto.preco)}</span><br>
                    <span>Estoque: ${produto.estoque}</span>
                `;
                
                item.addEventListener("click", () => abrirDetalhesProduto(produto));
                listaProdutos.appendChild(item);
            });
        }
        
        if (selectProduto) {
            selectProduto.innerHTML = '<option value="">Selecione um produto</option>';
            produtos.forEach(produto => {
                selectProduto.innerHTML += `
                    <option value="${produto.id}">${produto.nome}</option>
                `;
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);
    }
}

async function carregarPedidos() {
    if (!listaPedidos) return; 
    
    try {
        const resposta = await fetch("/api/pedidos");
        const pedidos = await resposta.json();
        listaPedidos.innerHTML = "";
        
        if (pedidos.length === 0) {
            listaPedidos.innerHTML = "<p>Nenhum pedido cadastrado.</p>";
            return;
        }
        
        pedidos.forEach(pedido => {
            listaPedidos.innerHTML += `
                <div class="item">
                    <strong>Pedido #${pedido.id}</strong>
                    <span>Produto: ${pedido.produto_nome}</span><br>
                    <span>Quantidade: ${pedido.quantidade}</span><br>
                    <span>Total: ${formatarMoeda(pedido.valor_total)}</span>
                </div>
            `;
        });
    } catch (erro) {
        console.error("Erro ao carregar pedidos:", erro);
    }
}

if (formProduto) {
    formProduto.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const produto = {
            nome: document.getElementById("nome").value,
            descricao: document.getElementById("descricao").value,
            preco: Number(document.getElementById("preco").value),
            estoque: Number(document.getElementById("estoque").value)
        };
        
        await fetch("/api/produtos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(produto)
        });
        
        formProduto.reset();
        carregarProdutos();
    });
}


if (formPedido) {
    formPedido.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        
        const pedido = {
            produto_id: Number(selectProduto.value),
            quantidade: Number(document.getElementById("quantidade").value)
        };
        
        await fetch("/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pedido)
        });
        
        formPedido.reset();
        carregarPedidos();
        carregarProdutos(); 
    });
}

carregarProdutos();
carregarPedidos();