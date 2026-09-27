import { ComponentCatalog, AssetCatalog } from "./catalog";
export default { title: "Каталог проекта" };
export const Components = {
  name: "Все компоненты и использование",
  render: () => <ComponentCatalog />,
};
export const Assets = { name: "Все ассеты", render: () => <AssetCatalog /> };
