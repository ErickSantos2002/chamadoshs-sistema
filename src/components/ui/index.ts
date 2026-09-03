/**
 * Kit de primitivos da interface.
 *
 * Importar daqui, não do arquivo: `import { Badge, Button } from '../ui'`.
 * Isso mantém um ponto único de entrada e permite mover ou renomear um
 * componente sem sair caçando import por todo o projeto.
 */
export { Avatar } from './Avatar';

export { Badge } from './Badge';
export type { VarianteBadge } from './Badge';

// Ícone de ação das tabelas de cadastro. `titulo` é obrigatório: é assim que
// o compilador garante que nenhum desses botões fique sem tooltip.
export { BotaoDeAcao } from './BotaoDeAcao';
export type { TomDeAcao } from './BotaoDeAcao';

export { Button } from './Button';
export type { VarianteBotao, TamanhoBotao } from './Button';

// Rótulo e erro de campo de FORMULÁRIO. Não confundir com o `Rotulo` abaixo,
// que é monoespaçado e serve a rótulo de painel.
export { MensagemDeErro, RotuloDeCampo } from './Campo';

export { Card, CardHeader, CardBody, CardTitle } from './Card';
export type { PaddingDoCard } from './Card';

// Os quatro cantos do painel — o motivo gráfico deste sistema. Só em painel:
// ver a nota no arquivo, e a D2-a.
export { Colchetes } from './Colchetes';
export type { VarianteColchetes, TamanhoColchetes } from './Colchetes';

export { Input } from './Input';

export { Modal } from './Modal';

export { Rotulo } from './Rotulo';

// O seletor do sistema, com a lista desenhada por nós — filtros e formulários.
export { Seletor } from './Seletor';
export type { OpcaoDoSeletor } from './Seletor';

// O anel de carregamento, e o bloco que centraliza um numa região vazia.
// `BlocoCarregando` é o que carrega a região viva — ver a nota no arquivo.
export { Spinner, BlocoCarregando } from './Spinner';
export type { TamanhoSpinner } from './Spinner';

export { IconeConfere, IconeSeta } from './icones';

export { Textarea } from './Textarea';
