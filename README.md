# Rocket Filmes — Sistema de Avaliação de Filmes

Módulo de administração de um catálogo de filmes, inspirado no Letterboxd,
desenvolvido para a atividade DEV do Rocket Lab 2026.2 (Visagio).

O administrador pode:

- navegar pelo catálogo paginado, com filtro por gênero e ordenação;
- buscar filmes pelo título;
- ver os detalhes de cada filme (sinopse, direção, elenco, produtoras) e suas avaliações;
- cadastrar, editar e remover filmes;
- adicionar avaliações (nota de 1 a 5 estrelas e resenha);
- ver a média das avaliações de cada filme e indicadores gerais do catálogo.

## Stack

| Camada         | Tecnologias                                           |
| -------------- | ----------------------------------------------------- |
| Frontend       | Vite, React 19, TypeScript, React Router, lucide-react |
| Backend        | FastAPI, SQLAlchemy 2 (async), Pydantic, Alembic      |
| Banco de dados | SQLite                                                |

## Pré-requisitos

- Python 3.11 ou superior
- Node.js 20.19 ou superior (com npm)
- Os arquivos CSV com os dados iniciais (fornecidos à parte, não versionados)

## Passo a passo para executar

### 1. Clonar o repositório

```bash
git clone https://github.com/juliamariateixeiraa/rocketlab2026-2.git
cd rocketlab2026-2
```

### 2. Colocar os CSVs na pasta `data/`

Crie a pasta `data/` na raiz do projeto e copie os 10 arquivos CSV para ela:

```text
data/
├── bridge_movie_company.csv
├── bridge_movie_genre.csv
├── bridge_movie_person.csv
├── dim_companies.csv
├── dim_genres.csv
├── dim_movies.csv
├── dim_people.csv
├── dim_reviews.csv
├── fact_movies_performance.csv
└── movies_reviews.csv
```

> Os CSVs somam cerca de 240 MB e por isso estão no `.gitignore`.

### 3. Backend: instalar, criar o banco e carregar os dados

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
cp .env.example .env
.venv/bin/alembic upgrade head           # cria as tabelas
.venv/bin/python -m app.scripts.seed     # carrega os CSVs (~1 minuto)
```

Para apagar os dados e carregar de novo: `.venv/bin/python -m app.scripts.seed --reset`.
Se os CSVs estiverem em outra pasta: `--data-dir /caminho/para/csvs`.

### 4. Backend: subir a API

Ainda na pasta `backend/`:

```bash
.venv/bin/uvicorn app.main:app --reload
```

A API fica em http://localhost:8000 e a documentação interativa em
http://localhost:8000/docs.

### 5. Frontend: instalar e subir

Em **outro terminal**, a partir da raiz do projeto:

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5173. Em desenvolvimento, o Vite repassa as chamadas
`/api` para o backend na porta 8000.

> No Windows, troque `.venv/bin/` por `.venv\Scripts\` nos comandos do backend.

## Testes e qualidade

```bash
# backend (a partir de backend/)
.venv/bin/pytest
.venv/bin/ruff check app tests

# frontend (a partir de frontend/)
npm run lint
npm run build
```

Os testes do backend usam um banco SQLite temporário e não alteram o banco local.

## Estrutura

```text
.
├── backend/
│   ├── app/
│   │   ├── api/v1/          # registro dos routers
│   │   ├── core/            # configurações e logging
│   │   ├── db/              # engine e sessões do SQLAlchemy
│   │   ├── movies/          # models, schemas, regras (service) e rotas (router)
│   │   └── scripts/seed.py  # carga dos CSVs
│   ├── migrations/          # revisões do Alembic
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/             # cliente HTTP e tipos da API
│       ├── components/      # sidebar, barra de busca, cards, carrossel, etc.
│       ├── hooks/           # requisições, debounce, gêneros, fundo de ambientação
│       ├── pages/           # Início, Catálogo, Avaliações, Detalhe, Formulário
│       └── utils/           # formatação e tradução dos gêneros
└── data/                    # CSVs (não versionados)
```

## Endpoints principais

Todos sob o prefixo `/api/v1`:

| Método | Rota                    | Descrição                                                                   |
| ------ | ----------------------- | --------------------------------------------------------------------------- |
| GET    | `/movies`               | Catálogo paginado (`busca`, `genero`, `ano`, `min_avaliacoes`, `ordenar`, `page`, `page_size`) |
| GET    | `/movies/{id}`          | Detalhes do filme, com avaliações e média                                   |
| POST   | `/movies`               | Cadastra um filme                                                           |
| PUT    | `/movies/{id}`          | Atualiza um filme                                                           |
| DELETE | `/movies/{id}`          | Remove um filme (e suas avaliações)                                         |
| POST   | `/movies/{id}/reviews`  | Adiciona uma avaliação                                                      |
| GET    | `/reviews`              | Todas as avaliações, das mais recentes para as mais antigas                  |
| GET    | `/genres`               | Lista de gêneros                                                            |
| GET    | `/stats`                | Total de filmes, total de avaliações e média geral                          |

## Decisões de implementação

- **Escala das notas:** o banco guarda as notas de 0 a 10, como no CSV. O
  frontend exibe e coleta de 1 a 5 estrelas e converte (4 estrelas = nota 8).
- **Média das avaliações:** calculada em tempo real a partir de `movie_reviews`,
  e não a partir do resumo pré-calculado de `dim_reviews`. Assim, uma avaliação
  nova já entra na média na hora.
- **Diretor e gênero:** não são colunas do filme. O diretor vem de `dim_people`
  (tipo "Diretor") e o gênero de `dim_genres`, ligados pelas tabelas ponte.
  No cadastro, diretores já existentes são reaproveitados.
- **Limpeza na carga:** o script corrige textos com aspas duplicadas do CSV e
  unifica pessoas e produtoras que ficam com nome repetido depois da limpeza.
- **Desempenho:** uma migration adiciona um índice em `popularidade` para
  paginar o catálogo sem ordenar os ~95 mil filmes a cada requisição.

## Observações sobre os dados

- A base só tem filmes lançados entre 2016 e 2029.
- Muitos filmes não têm pôster ou imagem de fundo; a interface mostra um substituto.
- As avaliações importadas do CSV não trazem data; todas recebem a data da carga.
