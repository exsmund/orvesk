shader_type canvas_item;
uniform vec4 shade : source_color;
uniform vec2 panel_size;
uniform vec2 inset = vec2(24.0, 24.0);
uniform vec2 header_size = vec2(444.0, 132.0);
void fragment() {
	vec2 p = UV * panel_size;
	vec2 outside = max(max(inset - p, p - inset - header_size), vec2(0.0));
	float contact = exp(-length(outside / vec2(12.0, 18.0)) * 1.6);
	float bounds = smoothstep(0.0, 8.0, min(min(p.x, panel_size.x - p.x), min(p.y, panel_size.y - p.y)));
	COLOR = vec4(shade.rgb, shade.a * contact * bounds * 0.88);
}
