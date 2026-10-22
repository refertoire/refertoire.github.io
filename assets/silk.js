/**
 * Silk Background (WebGL2)
 * Ported from React Bits Silk component
 * Renders flowing satin folds with glossy highlights.
 */
(function(global) {
  'use strict';

  var VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  var SILK = `
uniform vec2 uView;
uniform float uScale;
uniform float uRotation;
uniform float uTime;
uniform float uWave;
uniform float uRipple;
uniform float uFold;
uniform vec2 uShift;
uniform vec4 uPointer;
uniform vec2 uDrag;
uniform vec4 uWaves[4];

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  return rot * uv;
}

vec2 bend(vec2 uv) {
  vec2 aspect = vec2(uView.x / uView.y, 1.0);
  vec2 offset = (uv - uPointer.xy) * aspect;
  float touch = uPointer.z * exp(-dot(offset, offset) / (uPointer.w * uPointer.w));
  uv -= uDrag * touch;
  for (int i = 0; i < 4; i++) {
    vec4 wave = uWaves[i];
    if (wave.w <= 0.0) continue;
    vec2 q = (uv - wave.xy) * aspect;
    float dist = length(q);
    float front = dist - wave.z;
    float ring = exp(-front * front * 60.0) * wave.w;
    uv += q / max(dist, 0.0001) / aspect * ring * 0.034 * sin(front * 34.0);
  }
  return uv;
}

float silk(vec2 vUv) {
  vec2 uv = rotateUvs(vUv * uScale, uRotation);
  vec2 tex = uv * uScale + uShift;
  float tOffset = uTime;
  tex.y += 0.03 * uWave * sin(8.0 * tex.x - tOffset);
  return 0.6 + 0.4 * uFold * sin(5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * tOffset) + uRipple * sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));
}
`;

  var COMPOSITE = `#version 300 es
precision highp float;
${SILK}
uniform sampler2D uBloom;
uniform vec3 uColor;
uniform vec3 uSheenColor;
uniform float uNoiseIntensity;
uniform float uDepth;
uniform float uSheen;
uniform float uGlow;
uniform float uLightMode;
uniform vec3 uLight;
uniform vec2 uStep;
uniform float uPresence;
uniform float uFade;
out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec3 softClip(vec3 c) {
  vec3 over = max(c - 0.75, 0.0);
  return min(c, 0.75) + 0.25 * (1.0 - exp(-over * 4.0));
}

void main() {
  vec2 vUv = gl_FragCoord.xy / uView;
  vec2 coord = bend(vUv);
  float pattern = silk(coord);
  float rnd = noise(gl_FragCoord.xy);
  float n = clamp((pattern - 0.2) / 0.8, 0.0, 1.0);

  float gx = silk(coord + vec2(uStep.x, 0.0)) - pattern;
  float gy = silk(coord + vec2(0.0, uStep.y)) - pattern;
  vec3 normal = normalize(vec3(-gx * 26.0, -gy * 26.0, 1.0));
  vec3 toLight = normalize(vec3(uLight.xy, 0.85));
  float relief = 1.0 + (dot(normal, toLight) - toLight.z) * 1.8 * uDepth;
  vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));
  float gloss = pow(max(dot(normal, halfway), 0.0), 48.0) * smoothstep(0.25, 0.85, n);
  float crest = pow(n, 5.0);
  float shine = (gloss * 0.85 + crest * 0.4) * uSheen * (1.0 + uLight.z * 0.6);

  float bloom = 0.0;
  if (uGlow > 0.0) {
    bloom += textureLod(uBloom, vUv, 1.0).r * 0.35;
    bloom += textureLod(uBloom, vUv, 2.0).r * 0.3;
    bloom += textureLod(uBloom, vUv, 3.0).r * 0.2;
    bloom += textureLod(uBloom, vUv, 4.0).r * 0.15;
  }

  vec3 result;
  if (uLightMode > 0.5) {
    float fold = smoothstep(0.28, 0.9, pattern);
    float specular = smoothstep(0.72, 0.98, pattern);
    vec3 shadowColor = uColor * (0.72 - 0.12 * uDepth);
    vec3 bodyColor = min(uColor * 1.18, vec3(1.0));
    vec3 lightBase = mix(shadowColor, bodyColor, fold) * mix(1.0, relief, 0.6);
    lightBase = mix(lightBase, vec3(1.0), clamp(specular * 0.92 + shine * 0.22 + bloom * uGlow * 0.2, 0.0, 1.0));
    float fineNoise = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
    float grainSignal = (rnd + fineNoise - 1.0);
    float grainStrength = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
    result = clamp(lightBase + grainSignal * grainStrength, 0.0, 1.0);
  } else {
    float grain = rnd / 15.0 * uNoiseIntensity;
    float floorValue = mix(0.2, 0.03, uDepth);
    float curve = uDepth > 0.0 ? pow(n, 1.0 + 1.4 * uDepth) : n;
    float shade = uDepth > 0.0 ? floorValue + (1.0 - floorValue) * curve : pattern;
    vec3 tone = mix(uColor, pow(uColor, vec3(1.45)), (1.0 - n) * uDepth);
    vec3 lit = tone * shade * relief - vec3(grain);
    vec3 tint = mix(uColor, uSheenColor, 0.8);
    vec3 extra = tint * (shine + bloom * uGlow * 0.55);
    float blend = clamp((uSheen + uGlow) * 4.0, 0.0, 1.0);
    result = mix(clamp(lit, 0.0, 1.0), clamp(softClip(lit + extra), 0.0, 1.0), blend);
  }

  float edge = uFade * 0.5;
  float mask = 1.0;
  if (edge > 0.0) {
    mask = smootherstep01(vUv.x / edge) * smootherstep01((1.0 - vUv.x) / edge);
    mask *= smootherstep01(vUv.y / edge) * smootherstep01((1.0 - vUv.y) / edge);
  }
  float alpha = uPresence * mask;
  outColor = vec4(result * alpha, alpha);
}
`;

  var DEFAULT_LIGHT = [-0.55, 0.7];

  function parseHex(hex) {
    var clean = String(hex).replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(function(c) { return c + c; }).join('');
    }
    var num = parseInt(clean, 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  function link(gl, fragmentSource) {
    var vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    var fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
    }
    return { program: program, uniforms: uniforms };
  }

  function initSilk(container, opts) {
    if (!container) return null;

    opts = opts || {};
    var color = opts.color || '#3e3e3e';
    var sheenColor = opts.sheenColor || '#ffffff';
    var speed = typeof opts.speed === 'number' ? opts.speed : 6.9;
    var scale = typeof opts.scale === 'number' ? opts.scale : 1.0;
    var rotation = typeof opts.rotation === 'number' ? opts.rotation : 0.0;
    var sheen = typeof opts.sheen === 'number' ? opts.sheen : 0.5;
    var depth = typeof opts.depth === 'number' ? opts.depth : 0.0;
    var glow = typeof opts.glow === 'number' ? opts.glow : 0.0;
    var noiseIntensity = typeof opts.noiseIntensity === 'number' ? opts.noiseIntensity : 1.4;
    var mouseInteraction = !!opts.mouseInteraction;
    var clickRipple = !!opts.clickRipple;
    var intro = !!opts.intro;
    var fade = typeof opts.fade === 'number' ? opts.fade : 0.0;
    var lightMode = !!opts.lightMode;

    var canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'silk-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      container.appendChild(canvas);
    }

    var gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      console.warn('WebGL2 not supported, Silk background disabled.');
      return null;
    }

    var compositeProgram = link(gl, COMPOSITE);
    if (!compositeProgram) return null;

    var buffer = gl.createBuffer();
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Dummy 1x1 texture for uBloom sampler to avoid unbound sampler errors
    var dummyTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    var colorRgb = parseHex(color);
    var sheenRgb = parseHex(sheenColor);

    var view = { width: 1, height: 1, ratio: 1 };
    var waveData = new Float32Array(16);
    var flow = 0;
    var raf = 0;
    var last = 0;
    var visible = true;
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      var width = Math.max(1, container.clientWidth);
      var height = Math.max(1, container.clientHeight);
      var dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      view.width = width;
      view.height = height;
      view.ratio = dpr;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      if (!raf) render();
    }

    function render() {
      gl.bindVertexArray(vao);
      var c = compositeProgram.uniforms;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(compositeProgram.program);

      gl.uniform2f(c.uView, canvas.width, canvas.height);
      gl.uniform1f(c.uScale, scale);
      gl.uniform1f(c.uRotation, rotation);
      gl.uniform1f(c.uTime, flow);
      gl.uniform1f(c.uWave, 1.0);
      gl.uniform1f(c.uRipple, 1.0);
      gl.uniform1f(c.uFold, 1.0);
      gl.uniform2f(c.uShift, 0.0, 0.0);
      gl.uniform4f(c.uPointer, 0.0, 0.0, 0.0, 0.32);
      gl.uniform2f(c.uDrag, 0.0, 0.0);
      gl.uniform4fv(c.uWaves, waveData);

      gl.uniform3fv(c.uColor, colorRgb);
      gl.uniform3fv(c.uSheenColor, sheenRgb);
      gl.uniform1f(c.uNoiseIntensity, noiseIntensity);
      gl.uniform1f(c.uDepth, depth);
      gl.uniform1f(c.uSheen, sheen);
      gl.uniform1f(c.uGlow, glow);
      gl.uniform1f(c.uLightMode, lightMode ? 1.0 : 0.0);
      gl.uniform3f(c.uLight, DEFAULT_LIGHT[0], DEFAULT_LIGHT[1], 0.0);
      gl.uniform2f(c.uStep, view.ratio / canvas.width, view.ratio / canvas.height);
      gl.uniform1f(c.uPresence, 1.0);
      gl.uniform1f(c.uFade, fade);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
      gl.uniform1i(c.uBloom, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!prefersReduced && speed !== 0) {
        flow += dt * 0.1 * speed;
      }
      render();
      if (!prefersReduced) {
        raf = requestAnimationFrame(frame);
      }
    }

    var observer = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(function(entries) {
        visible = entries.some(function(entry) { return entry.isIntersecting; });
        if (visible && !raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      });
      observer.observe(container);
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && visible && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    });

    resize();
    raf = requestAnimationFrame(frame);

    return {
      destroy: function() {
        if (raf) cancelAnimationFrame(raf);
        if (observer) observer.disconnect();
        window.removeEventListener('resize', resize);
        gl.deleteTexture(dummyTexture);
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        gl.deleteProgram(compositeProgram.program);
      }
    };
  }

  global.initSilk = initSilk;
})(typeof window !== 'undefined' ? window : this);
