shader_type canvas_item;
render_mode unshaded;
uniform sampler2D metal : source_color, filter_linear;
uniform bool vertical = false;

void fragment() {
	vec2 uv = vertical ? UV.yx : UV;
	// A single metal face, excluding the frame's inner/outer rails.
	vec4 grain = texture(metal, vec2(mix(0.22, 0.78, uv.x), mix(0.002, 0.009, uv.y)));
	float center = sin(3.14159265 * uv.x);
	float fade = smoothstep(0.0, 0.27, uv.x) * smoothstep(0.0, 0.27, 1.0 - uv.x);
	vec4 modulation = COLOR;
	COLOR = vec4(grain.rgb * (0.85 + 0.35 * center), grain.a * fade * 0.80) * modulation;
}
