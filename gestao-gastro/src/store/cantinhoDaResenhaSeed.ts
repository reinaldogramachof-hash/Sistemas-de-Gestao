import { Product } from '../types';

type SeedProduct = [name: string, price: number, active?: boolean, description?: string];

const categories: Array<[category: string, products: SeedProduct[]]> = [
  ['Porções', [
    ['Torresmo', 48.90], ['Batata frita', 21.90], ['Batata com queijo', 29.90],
    ['Batata com queijo e bacon', 34.90], ['Frango a passarinho', 28.90],
    ['Tirinhas de frango', 35.90], ['Calabresa acebolada', 29.90],
    ['Linguiça em rodelas', 26.90], ['Contra filé', 49.90], ['Contra filé com batata', 64.90],
    ['Trio BCC (Batata frita + Calabresa acebolada + Contra filé)', 89.90],
  ]],
  ['Espetinhos', [
    ['Espetinho de carne', 9], ['Espetinho de frango', 8], ['Espetinho misto', 8],
    ['Espetinho de kafta', 8], ['Espetinho de coração', 8], ['Espetinho de queijo', 8],
    ['Medalhão de frango', 11], ['Medalhão de carne', 12], ['Pão de alho', 9],
  ]],
  ['Acompanhamentos', [['Arroz', 6]]],
  ['Bebidas', [
    ['Água com gás', 4], ['Água sem gás', 3], ['Coca-Cola (KS)', 7],
    ['Suco (consultar sabores)', 9.99], ['Batida (consultar sabores)', 24.90], ['Red Bull', 15],
  ]],
  ['Cervejas', [
    ['Heineken 600 ml', 18], ['Original 600 ml', 15], ['Skol 600 ml', 11],
    ['Heineken Zero', 12], ['Heineken Long Neck', 14], ['Budweiser 330 ml', 12],
    ['Skol Beats', 13], ['Smirnoff Ice', 12],
  ]],
  ['Drinks', [['Caipirinha', 20], ['Gin Dobro (promoção)', 20, true, 'Promoção ativa.']]],
  ['Doses', [
    ['Dose de cachaça', 4], ['Dose de cachaça com limão', 5], ['Whisky Jack Daniel’s', 30],
    ['Gin Tanqueray', 30], ['Gin Rocks', 20], ['Gin Gordons', 25], ['Vodka Absolut', 30], ['Licor na taça', 20],
  ]],
  ['Combos de Destilados', [
    ['Combo Gordons', 200], ['Combo Tanqueray', 300], ['Combo Absolut', 250],
    ['Combo Jack Daniel’s', 350], ['Combo Chivas', 0, false, 'Consultar valor.'],
  ]],
];

const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

/** Local catalogue used only when the Cantinho client starts with no saved data. */
export const cantinhoDaResenhaProducts: Product[] = categories.flatMap(([category, items]) =>
  items.map(([name, price, active = true, description]) => ({
    id: `cantinho-${slugify(name)}`,
    name,
    price,
    category,
    description: description ?? '',
    recipe: [],
    active,
  }))
);
