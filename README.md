Projeto acadêmico desenvolvido para estudo prático de **arquitetura de microsserviços**, **containerização com Docker** e **orquestração com Kubernetes**. A aplicação simula uma loja (Vokel Shop) dividida em serviços independentes que se comunicam via HTTP e mensageria assíncrona.

> 🎓 Projeto de estudo — foco em entender na prática como múltiplos serviços independentes são construídos, conteinerizados, orquestrados e escalados.

---

## 🧱 Arquitetura

A aplicação é composta por **3 microsserviços em Flask (Python)**, um banco **PostgreSQL** e um broker de mensagens **RabbitMQ**, usado para desacoplar a baixa de estoque do fluxo principal de criação de pedidos.


**Fluxo de um pedido:**
1. O usuário cria um pedido pelo `frontend-service`.
2. O `pedido-service` consulta o `produto-service` para validar o produto e obter o preço.
3. O pedido é gravado no PostgreSQL e publicado na fila `pedidos` do RabbitMQ.
4. O `produto-service`, como consumidor da fila, processa a mensagem de forma assíncrona e dá baixa no estoque — sem bloquear a resposta ao usuário.

---

## 🧩 Serviços

| Serviço | Porta | Responsabilidade |
|---|---|---|
| `frontend-service` | 5000 | Interface web (Flask + HTML/CSS/JS) e proxy das chamadas do navegador para os demais serviços |
| `produto-service` | 5001 | CRUD de produtos, controle de estoque e consumidor da fila RabbitMQ |
| `pedido-service` | 5002 | Criação e listagem de pedidos, validação com o `produto-service` e publicação na fila |

## 🛠️ Tecnologias

- **Python 3.12 + Flask** — APIs dos microsserviços
- **PostgreSQL 16** — persistência de produtos e pedidos
- **RabbitMQ 3.13** — mensageria assíncrona (baixa de estoque)
- **Docker** — containerização de cada serviço
- **Docker Compose** — orquestração local para desenvolvimento
- **Kubernetes** — orquestração, deployments, services e escalonamento

## 📁 Estrutura do projeto

```
microservicos-kubernetes/
├── frontend-service/       # Interface web + proxy das requisições
├── produto-service/        # API de produtos (+ consumidor RabbitMQ)
├── pedido-service/         # API de pedidos (+ publicador RabbitMQ)
├── k8s/                    # Manifests Kubernetes (Deployments e Services)
│   ├── postgres.yaml
│   ├── rabbitmq.yaml
│   ├── produto.yaml
│   ├── pedido.yaml
│   └── frontend.yaml
├── docker-compose.yml      # Subida local dos serviços + PostgreSQL
└── comandos.txt            # Comandos usados para build e deploy no Kubernetes
```

---

## 🚀 Como executar

### Opção 1 — Docker Compose (ambiente local rápido)

```bash
docker-compose up --build
```

Acesse: `http://localhost:5000`

> Obs.: o `docker-compose.yml` sobe `postgres`, `produto-service`, `pedido-service` e `frontend-service`. Para testar a mensageria com RabbitMQ localmente, é necessário adicioná-lo ao compose ou subir os serviços no Kubernetes (abaixo).

### Opção 2 — Kubernetes

**1. Build das imagens** (usadas localmente pelo cluster, `imagePullPolicy: Never`):
```bash
docker build -t produto-service:2.0 ./produto-service
docker build -t pedido-service:2.0 ./pedido-service
docker build -t frontend-service:2.0 ./frontend-service
```

**2. Aplicar os manifests:**
```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/produto.yaml
kubectl apply -f k8s/pedido.yaml
kubectl apply -f k8s/frontend.yaml
```

**3. Verificar o cluster:**
```bash
kubectl get pods
kubectl get services
kubectl get deployments
```

**4. Acessar a aplicação:**
O `frontend-service` é exposto via `NodePort` na porta `30080`. Em clusters locais (Minikube/Kind), use:
```bash
minikube service frontend-service
# ou acesse http://<IP-do-node>:30080
```

O painel do RabbitMQ (usuário/senha: `guest`/`guest`) fica disponível na `NodePort` `31672`.

### Escalando os serviços

```bash
kubectl scale deployment produto-service --replicas=3
kubectl scale deployment pedido-service --replicas=3
kubectl scale deployment frontend-service --replicas=3
```

### Reiniciando um deployment

```bash
kubectl rollout restart deployment/frontend-service
```

---

## 🔌 Principais endpoints

**produto-service**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/produtos` | Lista todos os produtos |
| POST | `/produtos` | Cadastra um novo produto |
| GET | `/produtos/<id>` | Busca um produto pelo ID |

**pedido-service**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/pedidos` | Lista os pedidos realizados |
| POST | `/pedidos` | Cria um novo pedido (valida produto, publica na fila) |

---

## 📚 O que este projeto trabalhou

- Separação de responsabilidades entre microsserviços independentes
- Comunicação síncrona via HTTP (REST) entre serviços
- Comunicação assíncrona via fila (RabbitMQ) para desacoplar processamento
- Persistência compartilhada em PostgreSQL com variáveis de ambiente por serviço
- Containerização de cada serviço com Dockerfiles próprios
- Deploy, Services (ClusterIP e NodePort) e escalonamento horizontal no Kubernetes

---

## 👤 Autor

Desenvolvido por **Henrique Linhares** como projeto de estudo em arquitetura de microsserviços e Kubernetes.
