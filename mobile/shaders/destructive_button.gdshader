shader_type canvas_item;
render_mode unshaded;
uniform vec4 tint : source_color;
void fragment() {
	vec4 color = COLOR;
	float high = max(color.r, max(color.g, color.b));
	float low = min(color.r, min(color.g, color.b));
	// Tint the dark neutral stone, preserving the brass frame and light lettering.
	float stone = (1.0 - smoothstep(0.25, 0.5, high)) * (1.0 - smoothstep(0.06, 0.18, high - low));
	color.rgb = mix(color.rgb, (color.rgb + vec3(0.055)) * tint.rgb * vec3(1.5, 0.65, 0.65), stone * 0.9);
	COLOR = color;
}
