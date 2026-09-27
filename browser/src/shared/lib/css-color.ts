/** Resolve CSS tokens for renderers (Canvas/Three.js) that cannot read var(). */
export function cssColor(
  name: `--color-${string}`,
  host: Element = document.documentElement,
): string {
  if (!getComputedStyle(host).getPropertyValue(name).trim()) {
    throw new Error(`Missing palette token: ${name}`);
  }
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  probe.style.display = "none";
  host.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}
