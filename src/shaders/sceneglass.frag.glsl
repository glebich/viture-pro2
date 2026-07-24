precision highp float;

varying vec2 vUv;

uniform sampler2D uScene;
uniform sampler2D uMask;
uniform sampler2D uField;
uniform vec2 uResolution;
uniform float uOpacity;
uniform float uFieldSpan;

const float REFRACT_STRENGTH = 10.2;
const float EDGE_WIDTH = 18.0;
const float NORMAL_SAMPLE_PX = 2.0;
const float NORMAL_STRENGTH = 5.0;
const float COVERAGE_SOFTNESS = 5.5;
const float COVERAGE_SAMPLE_PX = 0.85;
float decodeSd(float encoded) {
  return -(encoded - 0.5) * uFieldSpan;
}

vec3 sceneLinear(vec2 uv) {
  return pow(texture2D(uScene, clamp(uv, 0.0, 1.0)).rgb, vec3(2.2));
}

float sampleSd(vec2 uv) {
  return decodeSd(texture2D(uField, clamp(uv, 0.0, 1.0)).r);
}

float coverageFromSd(float sd) {
  return 1.0 - smoothstep(0.0, COVERAGE_SOFTNESS, sd);
}

float sampleCoverage(vec2 uv) {
  vec2 texel = vec2(COVERAGE_SAMPLE_PX) / uResolution;
  float c0 = coverageFromSd(sampleSd(uv));
  float c1 = coverageFromSd(sampleSd(uv + vec2(-texel.x, -texel.y)));
  float c2 = coverageFromSd(sampleSd(uv + vec2(texel.x, -texel.y)));
  float c3 = coverageFromSd(sampleSd(uv + vec2(-texel.x, texel.y)));
  float c4 = coverageFromSd(sampleSd(uv + vec2(texel.x, texel.y)));
  return (c0 + c1 + c2 + c3 + c4) / 5.0;
}

vec3 getNormal(vec2 uv) {
  vec2 texel = vec2(NORMAL_SAMPLE_PX) / uResolution;
  float sdL = sampleSd(uv - vec2(texel.x, 0.0));
  float sdR = sampleSd(uv + vec2(texel.x, 0.0));
  float sdT = sampleSd(uv - vec2(0.0, texel.y));
  float sdB = sampleSd(uv + vec2(0.0, texel.y));
  vec2 grad = vec2(sdR - sdL, sdB - sdT);
  vec3 n = vec3(-grad * NORMAL_STRENGTH, EDGE_WIDTH);
  return normalize(n);
}

void main() {
  vec2 fragCoord = vUv * uResolution;
  vec2 uv = fragCoord / uResolution;

  vec3 base = sceneLinear(uv);
  float sd = sampleSd(uv);
  float coverage = sampleCoverage(uv);

  if (coverage <= 0.001) {
    gl_FragColor = vec4(pow(base, vec3(1.0 / 2.2)), 0.0);
    return;
  }

  vec3 normal = getNormal(uv);

  float inside = 1.0 - smoothstep(0.0, EDGE_WIDTH, max(sd, 0.0));
  float refractAmt = inside * REFRACT_STRENGTH;
  vec2 refractOffset = normal.xy * refractAmt / uResolution;

  vec3 refracted = sceneLinear(uv + refractOffset);

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.18;
  vec3 glass = refracted + vec3(fresnel);
  vec3 color = mix(base, glass, inside);

  gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), coverage * uOpacity);
}
