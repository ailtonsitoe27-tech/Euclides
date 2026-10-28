# TechCare — Sistema Web de Gestão e Assistência Técnica de Computadores

Aplicação web de demonstração construída com HTML, CSS e JavaScript puro. Inclui login demonstrativo, gestão de clientes, computadores, ordens de serviço, acompanhamento de estados, painel, relatórios, impressão e cópias de segurança.

## 1. Requisitos

- Windows, Linux ou macOS.
- Visual Studio Code (ou outro editor de texto).
- Navegador moderno (Chrome, Edge, Firefox).
- Ligação à Internet apenas para carregar a fonte e as imagens ilustrativas externas. O funcionamento principal é local.

Não precisa de instalar bibliotecas, Node.js, PHP nem compilar o código.

## 2. Como executar no Visual Studio Code

1. Extraia `sistema_web_gestao_assistencia_v2.zip`.
2. Abra o Visual Studio Code.
3. Vá a **File > Open Folder** e escolha a pasta `sistema_web_gestao_assistencia_v2`.
4. Abra `index.html`.
5. Recomendado: instale a extensão **Live Server**, clique com o botão direito em `index.html` e escolha **Open with Live Server**. Também pode abrir o ficheiro directamente no navegador, embora Live Server seja mais consistente.

## 3. Acesso demonstrativo

- Utilizador: `admin`
- Palavra-passe: `admin123`

O login é apenas uma barreira de demonstração no navegador. As credenciais estão no JavaScript e não fornecem segurança real. Não use este protótipo para dados sensíveis nem o publique como sistema de produção sem implementar autenticação no servidor.

## 4. Funcionalidades

### Painel geral
- Contagem de clientes, equipamentos, ordens activas e serviços concluídos.
- Lista de ordens recentes.
- Barras de distribuição por estado.
- Atalhos para criar registos.

### Clientes
- Criar, listar, pesquisar, editar e eliminar.
- Nome, telefone, e-mail, documento e endereço.
- Impede eliminar clientes associados a equipamentos ou ordens.
- Validação de e-mail duplicado quando preenchido.

### Computadores
- Criar, listar, pesquisar, editar e eliminar.
- Cliente, tipo, marca, modelo, número de série, sistema operativo, estado e observações.
- Validação de número de série duplicado quando preenchido.
- Impede eliminar equipamentos associados a ordens.

### Ordens de serviço
- Criar, listar, pesquisar, filtrar por estado, editar, eliminar e imprimir ficha.
- Número da ordem, data, cliente, equipamento, problema, diagnóstico, estado, prioridade, técnico, custo e observações.
- Valida o vínculo entre o equipamento e o cliente escolhido.
- Estados: Pendente, Em reparação, Concluído, Entregue e Cancelado.

### Relatórios e backups
- Indicadores de ordens e custos de serviços concluídos/entregues.
- Imprimir relatório com a opção de impressão do navegador.
- Exportar ordens em CSV (separador `;`).
- Descarregar e importar backup JSON.
- Eliminar todos os dados com confirmação.

## 5. Onde os dados ficam guardados?

O projecto usa `localStorage` do navegador. Os dados permanecem no perfil do navegador e computador onde foram registados. Não existe sincronização entre computadores, utilizadores ou navegadores. Se limpar os dados do navegador, pode perder os registos. Use regularmente **Relatórios > Descarregar backup JSON**.

## 6. Limitações importantes

Este projecto é um protótipo front-end, não um sistema seguro de produção:
- O login é demonstrativo e não protege os dados de quem tem acesso ao navegador ou ao código.
- Não há base de dados central, contas reais, recuperação de palavra-passe, permissões por função nem registo de auditoria.
- O formulário não envia e-mails nem mensagens.
- Os valores monetários são registados em MT apenas como referência.
- As imagens e fontes externas precisam de Internet; se não carregarem, o sistema continua a funcionar.
- O `localStorage` tem capacidade limitada e é específico do navegador.

Para uso real por uma empresa ou por vários técnicos, implemente um backend com autenticação segura e uma base de dados (por exemplo, Node.js + MySQL/PostgreSQL), validação no servidor, permissões e backups no servidor.

## 7. Estrutura do projecto

```text
sistema_web_gestao_assistencia_v2/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    └── app.js
```

## 8. Personalização

- Alterar nome, textos e estrutura: `index.html`.
- Alterar cores e layout: variáveis CSS no início de `css/style.css`.
- Alterar credenciais demonstrativas e regras: `js/app.js`.
- Para começar com dados limpos, use a opção **Eliminar todos os dados** dentro de Relatórios ou limpe o armazenamento do site nas ferramentas do navegador.
