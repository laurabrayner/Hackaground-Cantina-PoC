# Cantinas do CESAR

App de pedidos antecipados para as cantinas do CESAR School. O estudante agenda o lanche para o
horário em que vai buscar, a cantina prepara na ordem certa e avisa quando o pedido fica pronto.
São três acessos: a **gestão do CESAR** cadastra as cantinas, cada **cantina** cuida dos próprios
pedidos, estoque e cardápio, e o **estudante** pede e avalia o que comeu.

> **Hackathon Relâmpago (FDS, cap. 5):** [onde estão os princípios de projeto no código](docs/principios.md).

## Demonstração

- **App online:** [cantinas-cesar.vercel.app](https://cantinas-cesar.vercel.app/)
- **Vídeo:** [assistir no YouTube](https://www.youtube.com/watch?v=wusz4GiqDT0)

## Tecnologias

![TypeScript](https://img.shields.io/badge/typescript-%233178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/vitest-%236E9F18.svg?style=for-the-badge&logo=vitest&logoColor=white)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![GitHub](https://img.shields.io/badge/github-%23181717.svg?style=for-the-badge&logo=github&logoColor=white)

- **Linguagem:** TypeScript.
- **Build e servidor de desenvolvimento:** [Vite](https://vitejs.dev/).
- **Testes:** [Vitest](https://vitest.dev/).
- **Interface:** HTML e CSS, no design system do [CESAR School](https://www.cesar.school).
- **Dados:** armazenamento do navegador, sem backend.

## Por que essas tecnologias

O app nasceu num hackathon relâmpago. Por isso, cada escolha teve que ajudar a entregar rápido, sem
prejudicar a organização do código nem a aplicação dos princípios de projeto do capítulo 5.

- **TypeScript:** com a tipagem estática, as regras de negócio (pedido, estoque, horários de
  intervalo) aparecem nos próprios tipos, e muitos erros surgem antes de rodar. As interfaces de
  [`portas.ts`](src/aplicacao/portas.ts) também viram contratos claros entre as camadas, o que
  sustenta a Inversão de Dependências.
- **Vite:** sobe o servidor de desenvolvimento em segundos e recarrega a página na hora, um ganho
  grande quando seis pessoas mexem no projeto ao mesmo tempo e o prazo é curto. O build final é um
  site estático, que publicamos na Vercel sem nenhuma configuração extra.
- **Vitest:** usa a mesma configuração do Vite e entende TypeScript sem ajustes. Os testes do
  domínio e dos casos de uso rodam em poucos segundos, então dá para testar a cada mudança.
- **HTML e CSS puros, sem framework de UI:** o app tem poucas telas e o foco do hackathon era a
  arquitetura, não a biblioteca de interface. Sem React ou similar, o projeto fica mais leve, tem
  menos dependências, e a camada `ui` continua apenas como um detalhe que conversa com os casos de
  uso. O visual segue o design system do CESAR School, com as fontes Barlow e DM Sans.
- **Armazenamento do navegador em vez de backend:** numa prova de conceito, um servidor e um banco
  custariam tempo sem mudar o que queríamos mostrar. Como os repositórios ficam atrás das portas em
  `src/infra`, dá para trocar o armazenamento por uma API de verdade no futuro sem alterar domínio
  nem casos de uso.

## Como rodar

### 1. Instalar o Node.js

Baixe a versão **LTS** em [nodejs.org](https://nodejs.org/) e instale.

### 2. Baixar o projeto

```bash
git clone https://github.com/luan-arruda/Hackground-Rel-mpago.git
cd Hackground-Rel-mpago
```

### 3. Instalar as dependências

```bash
npm install
```

### 4. Abrir o app

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) e use os botões do **Modo demonstração**, na tela de login.

### 5. Rodar os testes

```bash
npm test
```

## Squad

| Foto | Nome | GitHub | LinkedIn | Contribuição |
|---|---|---|---|---|
| <img src="docs/assets/team/anderson-santos.png" alt="Anderson Santos" width="80"> | Anderson Santos | [acampospsantos](https://github.com/acampospsantos) | [andersoncampospsantos](https://www.linkedin.com/in/andersoncampospsantos) | Testes automatizados com Vitest, deploy na Vercel e documentação |
| <img src="docs/assets/team/joao-vitor-medeiros.png" alt="João Vitor Medeiros" width="80"> | João Vitor Medeiros | [JvMedeiros7](https://github.com/JvMedeiros7) | [jvmedeiros7](https://www.linkedin.com/in/jvmedeiros7/) | Interface do estudante: consulta de cantinas, agendamento e avaliação de pedidos |
| <img src="docs/assets/team/julio-cesar-lins.png" alt="Julio Cesar Lins" width="80"> | Julio Cesar Lins | [Lins-ju](https://github.com/Lins-ju) | [júlio-lins](https://www.linkedin.com/in/j%C3%BAlio-lins-123905182/) | Controle de estoque, movimentações e previsão de demanda |
| <img src="docs/assets/team/laura-brayner.png" alt="Laura Brayner" width="80"> | Laura Brayner | [laurabrayner](https://github.com/laurabrayner) | [laurabrayner](https://www.linkedin.com/in/laurabrayner) | Painel da cantina (pedidos, cardápio e configurações) e design system |
| <img src="docs/assets/team/luan-arruda.png" alt="Luan Arruda" width="80"> | Luan Arruda | [luan-arruda](https://github.com/luan-arruda) | [luan-arruda-548a9534b](https://www.linkedin.com/in/luan-arruda-548a9534b) | Autenticação, autorização e acesso da gestão do CESAR |
| <img src="docs/assets/team/rodrigo-vasco.png" alt="Rodrigo Vasco" width="80"> | Rodrigo Vasco | [ByRodrigoVasco](https://github.com/ByRodrigoVasco) | [rodrigo-vlm](https://www.linkedin.com/in/rodrigo-vlm/) | Modelagem do domínio (pedidos, horários e intervalos de aula) e regras de negócio|
