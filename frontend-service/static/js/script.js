const $ = (id) => document.getElementById(id);
const pagina = document.body.dataset.page;

let produtos = [];
let carrinho = carregarCarrinho();

// ---------- utilidades ----------
function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function esc(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

function formatarData(valor) {
    const data = new Date(valor);
    if (isNaN(data)) return "";
    return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function toast(mensagem, tipo = "ok") {
    const el = document.createElement("div");
    el.className = `toast toast-${tipo}`;
    el.textContent = mensagem;
    $("toasts").appendChild(el);
    setTimeout(() => el.classList.add("toast-out"), 2800);
    setTimeout(() => el.remove(), 3200);
}

// Ícone e cor do "produto" derivados do nome/id, já que o catálogo não tem imagens.
const ICONES = [
    [/sensor|detector/i, "📡"],
    [/motor|servo/i, "⚙️"],
    [/clp|controlador|plc/i, "🖥️"],
    [/cabo|fio/i, "🔌"],
    [/bateria|fonte/i, "🔋"],
    [/rel[eé]|disjuntor|contator/i, "⚡"],
    [/v[aá]lvula|bomba/i, "🔧"],
    [/c[aâ]mera/i, "📷"],
];
const GRADIENTES = [
    ["#6d28d9", "#a78bfa"], ["#ea580c", "#fdba74"], ["#0891b2", "#67e8f9"],
    ["#be185d", "#f9a8d4"], ["#15803d", "#86efac"], ["#1d4ed8", "#93c5fd"],
];

function iconeDe(produto) {
    const achado = ICONES.find(([regex]) => regex.test(produto.nome));
    return achado ? achado[1] : "📦";
}

function artDoProduto(produto) {
    const [a, b] = GRADIENTES[produto.id % GRADIENTES.length];
    return `background: linear-gradient(135deg, ${a}, ${b})`;
}

function selo(produto) {
    if (produto.estoque <= 0) return ["Esgotado", "badge-out"];
    if (produto.estoque <= 5) return [`Restam ${produto.estoque}`, "badge-low"];
    return ["Em estoque", "badge-ok"];
}

async function api(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro || "Algo deu errado. Tente novamente.");
    return dados;
}

// ---------- carrinho ----------
function carregarCarrinho() {
    try {
        return JSON.parse(localStorage.getItem("vokel_carrinho")) || {};
    } catch {
        return {};
    }
}

function salvarCarrinho() {
    try {
        localStorage.setItem("vokel_carrinho", JSON.stringify(carrinho));
    } catch { /* storage indisponível: o carrinho vale só para esta sessão */ }
    renderCarrinho();
}

function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto || produto.estoque <= 0) return;
    const atual = carrinho[id] || 0;
    if (atual >= produto.estoque) {
        toast("Quantidade máxima em estoque atingida", "erro");
        return;
    }
    carrinho[id] = atual + 1;
    salvarCarrinho();
    toast(`${produto.nome} adicionado ao carrinho`);
}

function alterarQuantidade(id, delta) {
    const produto = produtos.find(p => p.id === id);
    const nova = (carrinho[id] || 0) + delta;
    if (nova <= 0) delete carrinho[id];
    else if (produto && nova > produto.estoque) return toast("Quantidade máxima em estoque atingida", "erro");
    else carrinho[id] = nova;
    salvarCarrinho();
}

function itensDoCarrinho() {
    return Object.entries(carrinho)
        .map(([id, quantidade]) => ({ produto: produtos.find(p => p.id === Number(id)), quantidade }))
        .filter(item => item.produto);
}

function renderCarrinho() {
    const itens = itensDoCarrinho();
    const totalItens = itens.reduce((soma, i) => soma + i.quantidade, 0);
    const total = itens.reduce((soma, i) => soma + i.quantidade * Number(i.produto.preco), 0);

    $("cartBadge").textContent = totalItens;
    $("cartBadge").classList.toggle("vazio", totalItens === 0);
    $("carrinhoTotal").textContent = formatarMoeda(total);
    $("finalizar").disabled = itens.length === 0;
    $("limparCarrinho").disabled = itens.length === 0;

    if (itens.length === 0) {
        $("carrinhoItens").innerHTML = `
            <div class="empty"><span>🛒</span><strong>Seu carrinho está vazio</strong>
            <p>Adicione produtos para continuar.</p></div>`;
        return;
    }

    $("carrinhoItens").innerHTML = itens.map(({ produto, quantidade }) => `
        <div class="cart-item">
            <div class="cart-thumb" style="${artDoProduto(produto)}">${iconeDe(produto)}</div>
            <div class="cart-info">
                <strong>${esc(produto.nome)}</strong>
                <span>${formatarMoeda(produto.preco)}</span>
                <div class="qty">
                    <button data-acao="menos" data-id="${produto.id}" aria-label="Diminuir">−</button>
                    <b>${quantidade}</b>
                    <button data-acao="mais" data-id="${produto.id}" aria-label="Aumentar">+</button>
                </div>
            </div>
            <div class="cart-sub">${formatarMoeda(quantidade * Number(produto.preco))}</div>
        </div>`).join("");
}

function abrirCarrinho(abrir) {
    $("carrinho").classList.toggle("aberto", abrir);
    $("overlay").classList.toggle("aberto", abrir);
}

async function finalizarCompra() {
    const itens = itensDoCarrinho();
    if (itens.length === 0) return;

    const botao = $("finalizar");
    botao.disabled = true;
    botao.textContent = "Processando...";

    let sucesso = 0;
    for (const { produto, quantidade } of itens) {
        try {
            await api("/api/pedidos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ produto_id: produto.id, quantidade })
            });
            delete carrinho[produto.id];
            sucesso++;
        } catch (erro) {
            toast(`${produto.nome}: ${erro.message}`, "erro");
        }
    }

    botao.textContent = "Finalizar compra";
    salvarCarrinho();
    if (sucesso > 0) {
        toast(`🎉 ${sucesso} pedido(s) realizado(s) com sucesso!`);
        // a baixa de estoque é assíncrona (RabbitMQ), então espera um instante antes de recarregar
        setTimeout(carregarProdutos, 1500);
        if (pagina === "pedidos") carregarPedidos();
    }
}

// ---------- modais ----------
function abrirModal(modal) { modal.classList.add("aberto"); }
function fecharModais() {
    document.querySelectorAll(".modal.aberto").forEach(m => m.classList.remove("aberto"));
}

let produtoAberto = null;
function abrirDetalhes(produto) {
    produtoAberto = produto;
    const [texto, classe] = selo(produto);
    $("modalImg").style.cssText = artDoProduto(produto);
    $("modalImg").textContent = iconeDe(produto);
    $("modalBadge").textContent = texto;
    $("modalBadge").className = `badge ${classe}`;
    $("modalNome").textContent = produto.nome;
    $("modalDescricao").textContent = produto.descricao || "Sem descrição disponível.";
    $("modalPreco").textContent = formatarMoeda(produto.preco);
    $("modalParcela").textContent = `ou 10x de ${formatarMoeda(produto.preco / 10)} sem juros`;
    $("modalEstoque").textContent = produto.estoque;
    $("modalComprar").disabled = produto.estoque <= 0;
    $("modalComprar").textContent = produto.estoque <= 0 ? "Produto esgotado" : "Adicionar ao carrinho";
    abrirModal($("productModal"));
}

// ---------- loja ----------
function renderProdutos() {
    const lista = $("listaProdutos");
    if (!lista) return;

    const termo = $("busca").value.trim().toLowerCase();
    let visiveis = produtos.filter(p =>
        `${p.nome} ${p.descricao}`.toLowerCase().includes(termo));

    const ordem = $("ordenar").value;
    if (ordem === "menor") visiveis.sort((a, b) => a.preco - b.preco);
    else if (ordem === "maior") visiveis.sort((a, b) => b.preco - a.preco);
    else if (ordem === "nome") visiveis.sort((a, b) => a.nome.localeCompare(b.nome));
    else visiveis.sort((a, b) => b.id - a.id);

    $("contadorProdutos").textContent = `${visiveis.length} produto(s) encontrado(s)`;

    if (visiveis.length === 0) {
        lista.innerHTML = `<div class="empty wide"><span>🔍</span><strong>Nenhum produto encontrado</strong>
            <p>Tente buscar por outro termo.</p></div>`;
        return;
    }

    lista.innerHTML = visiveis.map(p => {
        const [texto, classe] = selo(p);
        const esgotado = p.estoque <= 0;
        return `
        <article class="product-card" data-id="${p.id}">
            <div class="product-art" style="${artDoProduto(p)}">
                <span class="badge ${classe}">${texto}</span>
                <span class="product-icon">${iconeDe(p)}</span>
            </div>
            <div class="product-body">
                <h3>${esc(p.nome)}</h3>
                <p>${esc(p.descricao || "Sem descrição")}</p>
                <div class="price">${formatarMoeda(p.preco)}</div>
                <small class="installments">10x de ${formatarMoeda(p.preco / 10)} sem juros</small>
                <button class="btn btn-cta btn-sm" data-comprar="${p.id}" ${esgotado ? "disabled" : ""}>
                    ${esgotado ? "Esgotado" : "Adicionar ao carrinho"}
                </button>
            </div>
        </article>`;
    }).join("");
}

async function carregarProdutos() {
    try {
        produtos = await api("/api/produtos");
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);
        if ($("contadorProdutos")) $("contadorProdutos").textContent = "Não foi possível carregar os produtos.";
        return;
    }
    renderProdutos();
    renderCarrinho();
    preencherSelectProdutos();
}

// ---------- pedidos ----------
function preencherSelectProdutos() {
    const select = $("produto_id");
    if (!select) return;
    const anterior = select.value;
    select.innerHTML = '<option value="">Selecione um produto</option>' + produtos.map(p => `
        <option value="${p.id}" ${p.estoque <= 0 ? "disabled" : ""}>
            ${esc(p.nome)} — ${formatarMoeda(p.preco)}${p.estoque <= 0 ? " (esgotado)" : ""}
        </option>`).join("");
    select.value = anterior;
    atualizarTotalRapido();
}

function atualizarTotalRapido() {
    const alvo = $("totalRapido");
    if (!alvo) return;
    const produto = produtos.find(p => p.id === Number($("produto_id").value));
    const quantidade = Number($("quantidade").value) || 0;
    alvo.textContent = formatarMoeda(produto ? produto.preco * quantidade : 0);
}

async function carregarPedidos() {
    const lista = $("listaPedidos");
    if (!lista) return;

    let pedidos;
    try {
        pedidos = await api("/api/pedidos");
    } catch (erro) {
        console.error("Erro ao carregar pedidos:", erro);
        lista.innerHTML = '<div class="empty"><span>⚠️</span><strong>Não foi possível carregar os pedidos</strong></div>';
        return;
    }

    $("statPedidos").textContent = pedidos.length;
    $("statItens").textContent = pedidos.reduce((s, p) => s + p.quantidade, 0);
    $("statTotal").textContent = formatarMoeda(pedidos.reduce((s, p) => s + Number(p.valor_total), 0));

    if (pedidos.length === 0) {
        lista.innerHTML = `<div class="empty"><span>🧾</span><strong>Nenhum pedido ainda</strong>
            <p>Seus pedidos aparecerão aqui.</p><a class="btn btn-cta btn-sm" href="/">Ir às compras</a></div>`;
        return;
    }

    lista.innerHTML = pedidos.map(p => `
        <article class="order">
            <div class="order-head">
                <div><strong>Pedido #${p.id}</strong><small>${formatarData(p.criado_em)}</small></div>
                <span class="badge badge-ok">Confirmado</span>
            </div>
            <div class="order-body">
                <div class="cart-thumb" style="${artDoProduto({ id: p.produto_id })}">${iconeDe({ nome: p.produto_nome })}</div>
                <div class="order-info">
                    <strong>${esc(p.produto_nome)}</strong>
                    <span>${p.quantidade} × ${formatarMoeda(p.valor_unitario)}</span>
                </div>
                <div class="order-total">${formatarMoeda(p.valor_total)}</div>
            </div>
        </article>`).join("");
}

// ---------- eventos ----------
$("abrirCarrinho").addEventListener("click", () => abrirCarrinho(true));
$("fecharCarrinho").addEventListener("click", () => abrirCarrinho(false));
$("overlay").addEventListener("click", () => abrirCarrinho(false));
$("finalizar").addEventListener("click", finalizarCompra);
$("limparCarrinho").addEventListener("click", () => { carrinho = {}; salvarCarrinho(); });
$("carrinhoItens").addEventListener("click", (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (botao) alterarQuantidade(Number(botao.dataset.id), botao.dataset.acao === "mais" ? 1 : -1);
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { fecharModais(); abrirCarrinho(false); }
});

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest("[data-close]")) fecharModais();
    });
});

if (pagina === "loja") {
    $("busca").addEventListener("input", renderProdutos);
    $("ordenar").addEventListener("change", renderProdutos);
    $("abrirCadastro").addEventListener("click", () => abrirModal($("cadastroModal")));

    $("listaProdutos").addEventListener("click", (e) => {
        const comprar = e.target.closest("[data-comprar]");
        if (comprar) return adicionarAoCarrinho(Number(comprar.dataset.comprar));
        const card = e.target.closest(".product-card");
        if (card) abrirDetalhes(produtos.find(p => p.id === Number(card.dataset.id)));
    });

    $("modalComprar").addEventListener("click", () => {
        if (produtoAberto) adicionarAoCarrinho(produtoAberto.id);
        fecharModais();
        abrirCarrinho(true);
    });

    $("formProduto").addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            await api("/api/produtos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: $("nome").value,
                    descricao: $("descricao").value,
                    preco: Number($("preco").value),
                    estoque: Number($("estoque").value)
                })
            });
            e.target.reset();
            fecharModais();
            toast("Produto publicado com sucesso!");
            carregarProdutos();
        } catch (erro) {
            toast(erro.message, "erro");
        }
    });
} else {
    // Na página de pedidos a busca do cabeçalho leva para a loja.
    $("busca").addEventListener("keydown", (e) => {
        if (e.key === "Enter") location.href = "/";
    });
    $("produto_id").addEventListener("change", atualizarTotalRapido);
    $("quantidade").addEventListener("input", atualizarTotalRapido);

    $("formPedido").addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            await api("/api/pedidos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    produto_id: Number($("produto_id").value),
                    quantidade: Number($("quantidade").value)
                })
            });
            e.target.reset();
            toast("🎉 Pedido realizado com sucesso!");
            carregarPedidos();
            setTimeout(carregarProdutos, 1500);
        } catch (erro) {
            toast(erro.message, "erro");
        }
    });
    carregarPedidos();
}

renderCarrinho();
carregarProdutos();
