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

export { Button } from './Button';
export type { VarianteBotao, TamanhoBotao } from './Button';

// Rótulo e erro de campo de FORMULÁRIO. Não confundir com o `Rotulo` abaixo,
// que é monoespaçado e serve a rótulo de painel.
export { MensagemDeErro, RotuloDeCampo } from './Campo';

export { Card, CardHeader, CardBody } from './Card';

export { Colchetes } from './Colchetes';

export { Input } from './Input';

export { Modal } from './Modal';

export { Rotulo } from './Rotulo';

export { Select } from './Select';

// Seletor dos FILTROS, com a lista desenhada por nós. O `Select` acima
// continua sendo o certo em formulário — veja o cabeçalho de cada um.
export { SeletorDeFiltro } from './SeletorDeFiltro';
export type { OpcaoDeFiltro } from './SeletorDeFiltro';

export { IconeConfere, IconeSeta } from './icones';

export { Textarea } from './Textarea';
