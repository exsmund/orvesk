import { useEffect, useRef } from "react";
import { resourceFragment, resourceVertex } from "./resource-bar-shader";
import "./resource-bar.css";

export interface ResourceBarProps {
  value: number;
  change?: number;
  max: number;
  kind: "health" | "poise";
  className?: string;
  compact?: boolean;
  effect?: "plasma" | "smoke" | "flame";
  label?: string;
}
const displayValue = (value: number) =>
  value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
const finite = (n: number) => (Number.isFinite(n) ? n : 0);
/** Shared animated health and poise meter. */
export function ResourceBar({
  value,
  change,
  max,
  kind,
  className = "",
  compact = false,
  label,
  effect = "smoke",
}: ResourceBarProps) {
  const limit = Math.max(0, finite(max)),
    current = Math.max(0, Math.min(limit, finite(value)));
  const delta = Math.round(finite(change ?? 0) * 10) / 10;
  const deltaText =
    delta < 0 ? `−${displayValue(-delta)}` : `+${displayValue(delta)}`;
  const target = useRef({ current, limit, kind, effect, compact });
  useEffect(() => {
    target.current = { current, limit, kind, effect, compact };
  }, [current, limit, kind, effect, compact]);
  const host = useRef<HTMLDivElement>(null),
    number = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let disposed = false,
      cleanup = () => {};
    const element = host.current!;
    void (async () => {
      const {
        WebGLRenderer,
        Scene,
        OrthographicCamera,
        PlaneGeometry,
        ShaderMaterial,
        Mesh,
      } = await import("three");
      if (disposed) return;
      const renderer = new WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setClearColor(0, 0);
      const media = matchMedia("(prefers-reduced-motion: reduce)");
      const state = {
        value: target.current.current,
        max: target.current.limit,
        fill: target.current.limit
          ? target.current.current / target.current.limit
          : 0,
      };
      let trail = state.fill,
        time = 0,
        visible = true,
        last = 0,
        frame = 0;
      const uniforms = {
        uFlame: { value: 0 },
        uHeight: { value: 64 },
        uCompact: { value: compact ? 1 : 0 },
        uSmoke: { value: target.current.effect === "smoke" ? 1 : 0 },
        uTime: { value: 0 },
        uWidth: { value: 1 },
        uFill: { value: state.fill },
        uTrail: { value: trail },
        uKind: { value: target.current.kind === "poise" ? 1 : 0 },
      };
      const material = new ShaderMaterial({
        precision: "highp",
        vertexShader: resourceVertex,
        fragmentShader: resourceFragment,
        uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const geometry = new PlaneGeometry(2, 2),
        scene = new Scene(),
        camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const mesh = new Mesh(geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);
      const resize = () => {
        const t = target.current,
          height = t.effect !== "plasma" && t.compact ? 48 : 64;
        const width = Math.max(1, element.clientWidth);
        renderer.setSize(width, height, false);
        uniforms.uWidth.value = width;
        uniforms.uHeight.value = height;
        uniforms.uCompact.value = t.compact ? 1 : 0;
      };
      resize();
      element.append(renderer.domElement);
      element.dataset.renderer = "three";
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      const visibility = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      visibility.observe(element);
      const render = (now: number) => {
        frame = requestAnimationFrame(render);
        if (document.hidden || !visible) {
          last = now;
          return;
        }
        if (now - last < 25) return;
        const dt = Math.min(now - last, 64) / 1000,
          t = target.current;
        last = now;
        const blend = media.matches ? 1 : 1 - Math.exp(-dt * 12);
        state.value += (t.current - state.value) * blend;
        state.max += (t.limit - state.max) * blend;
        const fraction = t.limit ? t.current / t.limit : 0;
        state.fill += (fraction - state.fill) * blend;
        if (Math.abs(state.fill - fraction) < 0.0001) state.fill = fraction;
        trail = Math.max(
          state.fill,
          trail +
            (state.fill - trail) * (media.matches ? 1 : 1 - Math.exp(-dt * 4)),
        );
        if (!media.matches) time += dt;
        uniforms.uFlame.value = t.effect === "flame" ? 1 : 0;
        uniforms.uSmoke.value = t.effect === "smoke" ? 1 : 0;
        uniforms.uTime.value = time;
        uniforms.uFill.value = state.fill;
        uniforms.uTrail.value = trail;
        uniforms.uKind.value = t.kind === "poise" ? 1 : 0;
        if (number.current)
          number.current.textContent = `${displayValue(state.value)} / ${displayValue(state.max)}`;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(render);
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        visibility.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        delete element.dataset.renderer;
      };
    })().catch(() => {
      cleanup();
      if (!disposed) element.dataset.renderer = "fallback";
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [effect, compact]);
  return (
    <div
      className={`resource-bar resource-bar--${kind} resource-bar--${effect} ${compact ? "resource-bar--compact" : ""} ${className}`}
      role="meter"
      aria-label={label ?? (kind === "health" ? "Здоровье" : "Стойка")}
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={limit || 1}
      aria-valuetext={`${current} / ${limit}${delta ? `, прогноз изменения ${deltaText}` : ""}`}
    >
      <div className="resource-bar__numbers" aria-hidden="true">
        <span ref={number}>
          {displayValue(current)} / {displayValue(limit)}
        </span>
        {delta !== 0 && (
          <span
            className={`resource-bar__change resource-bar__change--${delta < 0 ? "loss" : "gain"}`}
          >
            {deltaText}
          </span>
        )}
      </div>
      <div className="resource-bar__canvas" ref={host} aria-hidden="true">
        <div className="resource-bar__fallback">
          <i style={{ width: `${limit ? (current / limit) * 100 : 0}%` }} />
        </div>
      </div>
    </div>
  );
}
