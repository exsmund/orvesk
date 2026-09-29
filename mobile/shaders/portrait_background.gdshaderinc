// Quiet warm charcoal ground, composited behind transparent portrait artwork.
float portrait_hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float portrait_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(portrait_hash(i), portrait_hash(i + vec2(1.0, 0.0)), f.x),
		mix(portrait_hash(i + vec2(0.0, 1.0)), portrait_hash(i + vec2(1.0)), f.x), f.y);
}
vec3 portrait_ground(vec2 uv) {
	float cloud = portrait_noise(uv * 5.0) * 0.65 + portrait_noise(uv * 19.0) * 0.25 + portrait_noise(uv * 150.0) * 0.10;
	float light = max(0.0, 1.0 - length((uv - vec2(0.43, 0.32)) * vec2(1.3, 1.0)));
	return mix(vec3(0.022, 0.020, 0.017), vec3(0.082, 0.071, 0.052), cloud * 0.55 + light * 0.45);
}
