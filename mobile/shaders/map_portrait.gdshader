shader_type canvas_item;
// All nodes use the same independent rim, backing and optional content layers.
uniform sampler2D backing : source_color;
uniform sampler2D content_texture : source_color;
uniform bool show_content = false;
uniform bool is_portrait = false;
uniform bool grayscale = false;
uniform vec4 content_box = vec4(0.19, 0.19, 0.62, 0.62);
uniform vec4 square_crop = vec4(0.18, 0.055, 0.64, 0.64);
void fragment() {
	vec4 base = texture(backing, UV);
	if (show_content) {
		vec2 local = (UV - content_box.xy) / content_box.zw;
		vec2 source_uv = is_portrait ? square_crop.xy + local * square_crop.zw : local;
		vec4 content = texture(content_texture, source_uv);
		float inside = step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0);
		if (is_portrait) inside *= 1.0 - smoothstep(0.48, 0.50, length(local - vec2(0.5)));
		content.a *= inside;
		base.rgb = mix(base.rgb, content.rgb, content.a);
		base.a = max(base.a, content.a);
	}
	vec4 rim = texture(TEXTURE, UV);
	base.rgb = mix(base.rgb, rim.rgb, rim.a);
	base.a = max(base.a, rim.a);
	if (grayscale) base.rgb = vec3(dot(base.rgb, vec3(0.299, 0.587, 0.114)));
	COLOR = base;
}
