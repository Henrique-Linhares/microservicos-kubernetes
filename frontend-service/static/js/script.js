// Captura os elementos HTML que serão manipulados pelo JavaScript.
const listaProdutos = document.getElementById("listaProdutos");
const listaPedidos = document.getElementById("listaPedidos");
const selectProduto = document.getElementById("produto_id");
const formProduto = document.getElementById("formProduto");
const formPedido = document.getElementById("formPedido");
// Formata valores numéricos no padrão de moeda brasileira.

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}
// Busca os produtos no backend e atualiza a lista e o campo select.
async function carregarProdutos() {
    const resposta = await fetch("/api/produtos");
    const produtos = await resposta.json();
    listaProdutos.innerHTML = "";
    selectProduto.innerHTML = '<option value="">Selecione um produto</option>';
    produtos.forEach(produto => {
        listaProdutos.innerHTML += `
<div class="item">
<strong>${produto.nome}</strong>
<span>${produto.descricao || "Sem descrição"}</span><br>
<span>Preço: ${formatarMoeda(produto.preco)}</span><br>
<span>Estoque: ${produto.estoque}</span>
</div>
`;
        selectProduto.innerHTML += `
<option value="${produto.id}">${produto.nome}</option>
`;
    });
}
// Busca os pedidos gravados no banco e monta a lista visual.
async function carregarPedidos() {
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
}
// Intercepta o envio do formulário de produto para enviar os dados via fetch.
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
// Intercepta o envio do formulário de pedido para criar um novo pedido via API.
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
});
// Carrega os dados iniciais assim que a página é aberta.
carregarProdutos();
carregarPedidos();