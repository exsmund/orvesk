import { useState } from "react";
import data from "./generated/catalog.json";
export function ComponentUsage({ name }: { name: string }) {
  const c = data.components.find((c) => c.name === name);
  if (!c) return null;
  return (
    <aside className="sb-usage">
      <h2>{c.name}</h2>
      <code>
        {c.file}:{c.line}
      </code>
      <p className={c.active ? "sb-active" : "sb-unused"}>
        {c.active
          ? "Используется в приложении"
          : c.uses.some((u) => u.file.startsWith("src/"))
            ? "Не используется в основном интерфейсе: есть только в неактивной ветке компонентов"
            : c.uses.length
              ? "В приложении не используется; встречается только в тестах"
              : "Нигде не используется"}
      </p>
      <p>
        {c.exported
          ? "Экспортируемый компонент"
          : "Внутренний компонент — отображается в составе родителя"}
      </p>
      {c.uses.length > 0 && (
        <details>
          <summary>Все места использования ({c.uses.length})</summary>
          <ul>
            {c.uses.map((u, i) => (
              <li key={i}>
                <code>
                  {u.file}:{u.line}
                </code>{" "}
                — {u.owner?.split("#")[1] ?? "точка входа / тест"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </aside>
  );
}
export function ComponentCatalog() {
  const [query, setQuery] = useState(""),
    [unused, setUnused] = useState(false);
  return (
    <section className="sb-catalog">
      <h1>Компоненты проекта</h1>
      <p>
        {data.components.length} компонентов. Для экспортируемых компонентов
        откройте живые примеры в разделе «Компоненты». Внутренние компоненты
        перечислены здесь с родителями.
      </p>
      <p>
        Использование вычисляется по JSX-ссылкам TypeScript и достижимости из
        App. Тесты учитываются отдельно. Это статический анализ: условно
        показываемые компоненты считаются используемыми; динамическое создание
        компонентов без JSX потребует расширения анализатора.
      </p>
      <div className="sb-filters">
        <input
          aria-label="Поиск компонентов"
          placeholder="Название или файл"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={unused}
            onChange={(e) => setUnused(e.target.checked)}
          />{" "}
          Только неиспользуемые в приложении
        </label>
      </div>
      {data.components
        .filter(
          (c) =>
            (!unused || !c.active) &&
            `${c.name} ${c.file}`.toLowerCase().includes(query.toLowerCase()),
        )
        .map((c) => (
          <ComponentUsage key={c.file + c.name} name={c.name} />
        ))}
    </section>
  );
}
export function AssetCatalog() {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("all");
  const shown = data.assets.filter(
    (a) =>
      (group === "all" || a.file.startsWith(group + "/")) &&
      a.file.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="sb-catalog">
      <h1>Все ассеты проекта</h1>
      <p>
        {data.assets.length} файлов из public, assets и refs — игровые ресурсы,
        исходники генераций и референсы. Показано: {shown.length}.
      </p>
      <p>
        Ссылки в исходниках показываются для точного пути. Отсутствие прямой
        ссылки не означает, что ассет не используется: пути могут собираться из
        конфигов и шаблонов.
      </p>
      <div className="sb-filters">
        <input
          aria-label="Поиск ассетов"
          placeholder="Путь или имя файла"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Папка ассетов"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          {["all", "public", "assets", "refs"].map((g) => (
            <option key={g} value={g}>
              {g === "all" ? "Все папки" : g}
            </option>
          ))}
        </select>
      </div>
      <div className="sb-assets">
        {shown.map((a) => (
          <article key={a.file}>
            {/\.(png|jpe?g|webp|svg|gif|avif|ico)$/.test(a.extension) ? (
              <a
                className="sb-asset-preview"
                href={a.url}
                target="_blank"
                rel="noreferrer"
              >
                <img loading="lazy" src={a.url} alt={a.file} />
              </a>
            ) : (
              <a href={a.url} target="_blank" rel="noreferrer">
                Открыть файл
              </a>
            )}
            <code>{a.file}</code>
            <small>
              {(a.bytes / 1024).toFixed(1)} КБ · {a.extension}
            </small>
            <details>
              <summary>Прямые ссылки: {a.uses.length}</summary>
              {a.uses.length ? (
                a.uses.map((u, i) => (
                  <p key={i}>
                    <code>
                      {u.file}:{u.line}
                    </code>
                  </p>
                ))
              ) : (
                <p>Прямые ссылки не найдены. Возможен выбор по конфигу.</p>
              )}
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
