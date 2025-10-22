// Galaxy Background - WebGL with CSS Fallback
class Galaxy {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      focal: [0.5, 0.5],
      rotation: [1.0, 0.0],
      starSpeed: 0.5,
      density: 1,
      hueShift: 140,
      disableAnimation: false,
      speed: 1.0,
      mouseInteraction: true,
      glowIntensity: 0.3,
      saturation: 0.0,
      mouseRepulsion: true,
      repulsionStrength: 2,
      twinkleIntensity: 0.3,
      rotationSpeed: 0.1,
      autoCenterRepulsion: 0,
      transparent: true,
      ...options
    };
    
    this.targetMousePos = { x: 0.5, y: 0.5 };
    this.smoothMousePos = { x: 0.5, y: 0.5 };
    this.targetMouseActive = 0.0;
    this.smoothMouseActive = 0.0;
    
    this.init();
  }
  
  init() {
    console.log('Galaxy: Initializing...');
    this.setupWebGL();
  }
  
  setupWebGL() {
    try {
      console.log('Galaxy: Attempting WebGL...');
      this.createWebGLGalaxy();
      console.log('Galaxy: WebGL created successfully');
    } catch (error) {
      console.warn('Galaxy: WebGL failed, using CSS fallback:', error);
      this.setupCSSFallback();
    }
  }
  
  createWebGLGalaxy() {
    // Create canvas as background
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';
    this.canvas.style.borderRadius = '30px';
    this.canvas.style.overflow = 'hidden';
    // WebGL will provide the background, no CSS background needed
    
    // Insert as first child (background)
    this.container.insertBefore(this.canvas, this.container.firstChild);
    
    // Get WebGL context
    this.gl = this.canvas.getContext('webgl', { 
      alpha: this.options.transparent,
      premultipliedAlpha: false 
    });
    
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
    
    console.log('Galaxy: WebGL context created');
    
    if (this.options.transparent) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.clearColor(0, 0, 0, 0);
    } else {
      this.gl.clearColor(0, 0, 0, 1);
    }
    
    this.setupShaders();
    this.setupGeometry();
    this.setupUniforms();
    this.setupEventListeners();
    this.startAnimation();
  }
  
  setupShaders() {
    const vertexShaderSource = `
      attribute vec2 uv;
      attribute vec2 position;
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
      }
    `;
    
    const fragmentShaderSource = `
      precision highp float;
      
      uniform float uTime;
      uniform vec3 uResolution;
      uniform vec2 uFocal;
      uniform vec2 uRotation;
      uniform float uStarSpeed;
      uniform float uDensity;
      uniform float uHueShift;
      uniform float uSpeed;
      uniform vec2 uMouse;
      uniform float uGlowIntensity;
      uniform float uSaturation;
      uniform bool uMouseRepulsion;
      uniform float uTwinkleIntensity;
      uniform float uRotationSpeed;
      uniform float uRepulsionStrength;
      uniform float uMouseActiveFactor;
      uniform float uAutoCenterRepulsion;
      uniform bool uTransparent;
      
      varying vec2 vUv;
      
      #define NUM_LAYER 4.0
      #define STAR_COLOR_CUTOFF 0.2
      #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
      #define PERIOD 3.0
      
      float Hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      
      float tri(float x) {
        return abs(fract(x) * 2.0 - 1.0);
      }
      
      float tris(float x) {
        float t = fract(x);
        return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
      }
      
      float trisn(float x) {
        float t = fract(x);
        return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
      }
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      float Star(vec2 uv, float flare) {
        float d = length(uv);
        float m = (0.05 * uGlowIntensity) / d;
        float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
        m += rays * flare * uGlowIntensity;
        uv *= MAT45;
        rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
        m += rays * 0.3 * flare * uGlowIntensity;
        m *= smoothstep(1.0, 0.2, d);
        return m;
      }
      
      vec3 StarLayer(vec2 uv) {
        vec3 col = vec3(0.0);
        
        vec2 gv = fract(uv) - 0.5; 
        vec2 id = floor(uv);
        
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 si = id + vec2(float(x), float(y));
            float seed = Hash21(si);
            float size = fract(seed * 345.32);
            float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
            float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;
            
            float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
            float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
            float grn = min(red, blu) * seed;
            vec3 base = vec3(red, grn, blu);
            
            float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
            hue = fract(hue + uHueShift / 360.0);
            float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
            float val = max(max(base.r, base.g), base.b);
            base = hsv2rgb(vec3(hue, sat, val));
            
            vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
            
            float star = Star(gv - offset - pad, flareSize);
            vec3 color = base;
            
            float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
            twinkle = mix(1.0, twinkle, uTwinkleIntensity);
            star *= twinkle;
            
            col += star * size * color;
          }
        }
        
        return col;
      }
      
      void main() {
        vec2 focalPx = uFocal * uResolution.xy;
        vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
        
        vec2 mouseNorm = uMouse - vec2(0.5);
        
        // Add distortion effect
        float distortion = sin(uv.x * 10.0 + uTime * 2.0) * 0.02 + 
                         sin(uv.y * 8.0 + uTime * 1.5) * 0.02;
        uv += vec2(distortion, distortion * 0.5);
        
        if (uAutoCenterRepulsion > 0.0) {
          vec2 centerUV = vec2(0.0, 0.0);
          float centerDist = length(uv - centerUV);
          vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
          uv += repulsion * 0.05;
        } else if (uMouseRepulsion) {
          vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
          float mouseDist = length(uv - mousePosUV);
          vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
          uv += repulsion * 0.05 * uMouseActiveFactor;
        } else {
          vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
          uv += mouseOffset;
        }
        
        float autoRotAngle = uTime * uRotationSpeed;
        mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
        uv = autoRot * uv;
        
        uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;
        
        // Black background
        vec3 col = vec3(0.0, 0.0, 0.0);
        
        for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
          float depth = fract(i + uStarSpeed * uSpeed);
          float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
          float fade = depth * smoothstep(1.0, 0.9, depth);
          col += StarLayer(uv * scale + i * 453.32) * fade;
        }
        
        if (uTransparent) {
          float alpha = length(col);
          alpha = smoothstep(0.0, 0.3, alpha);
          alpha = min(alpha, 1.0);
          gl_FragColor = vec4(col, alpha);
        } else {
          gl_FragColor = vec4(col, 1.0);
        }
      }
    `;
    
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      throw new Error('Shader program failed to link');
    }
    
    console.log('Galaxy: Shaders compiled successfully');
  }
  
  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error('Shader compilation failed: ' + error);
    }
    
    return shader;
  }
  
  setupGeometry() {
    // Create triangle geometry
    const vertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
       1,  1, 1, 1,
      -1, -1, 0, 0,
       1,  1, 1, 1,
      -1,  1, 0, 1
    ]);
    
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
  }
  
  setupUniforms() {
    this.uniforms = {
      uTime: this.gl.getUniformLocation(this.program, 'uTime'),
      uResolution: this.gl.getUniformLocation(this.program, 'uResolution'),
      uFocal: this.gl.getUniformLocation(this.program, 'uFocal'),
      uRotation: this.gl.getUniformLocation(this.program, 'uRotation'),
      uStarSpeed: this.gl.getUniformLocation(this.program, 'uStarSpeed'),
      uDensity: this.gl.getUniformLocation(this.program, 'uDensity'),
      uHueShift: this.gl.getUniformLocation(this.program, 'uHueShift'),
      uSpeed: this.gl.getUniformLocation(this.program, 'uSpeed'),
      uMouse: this.gl.getUniformLocation(this.program, 'uMouse'),
      uGlowIntensity: this.gl.getUniformLocation(this.program, 'uGlowIntensity'),
      uSaturation: this.gl.getUniformLocation(this.program, 'uSaturation'),
      uMouseRepulsion: this.gl.getUniformLocation(this.program, 'uMouseRepulsion'),
      uTwinkleIntensity: this.gl.getUniformLocation(this.program, 'uTwinkleIntensity'),
      uRotationSpeed: this.gl.getUniformLocation(this.program, 'uRotationSpeed'),
      uRepulsionStrength: this.gl.getUniformLocation(this.program, 'uRepulsionStrength'),
      uMouseActiveFactor: this.gl.getUniformLocation(this.program, 'uMouseActiveFactor'),
      uAutoCenterRepulsion: this.gl.getUniformLocation(this.program, 'uAutoCenterRepulsion'),
      uTransparent: this.gl.getUniformLocation(this.program, 'uTransparent')
    };
  }
  
  setupEventListeners() {
    if (this.options.mouseInteraction) {
      // Listen on the container instead of canvas
      this.container.addEventListener('mousemove', (e) => {
        const rect = this.container.getBoundingClientRect();
        this.targetMousePos.x = (e.clientX - rect.left) / rect.width;
        this.targetMousePos.y = 1.0 - (e.clientY - rect.top) / rect.height;
        this.targetMouseActive = 1.0;
      });
      
      this.container.addEventListener('mouseleave', () => {
        this.targetMouseActive = 0.0;
      });
    }
    
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }
  
  resize() {
    const scale = 1;
    this.canvas.width = this.canvas.offsetWidth * scale;
    this.canvas.height = this.canvas.offsetHeight * scale;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.uniforms.uResolution) {
      this.gl.uniform3f(this.uniforms.uResolution, this.canvas.width, this.canvas.height, this.canvas.width / this.canvas.height);
    }
  }
  
  startAnimation() {
    const animate = (t) => {
      this.animateId = requestAnimationFrame(animate);
      
      if (!this.options.disableAnimation) {
        this.gl.uniform1f(this.uniforms.uTime, t * 0.001);
        this.gl.uniform1f(this.uniforms.uStarSpeed, (t * 0.001 * this.options.starSpeed) / 10.0);
      }
      
      // Smooth mouse interpolation
      const lerpFactor = 0.05;
      this.smoothMousePos.x += (this.targetMousePos.x - this.smoothMousePos.x) * lerpFactor;
      this.smoothMousePos.y += (this.targetMousePos.y - this.smoothMousePos.y) * lerpFactor;
      this.smoothMouseActive += (this.targetMouseActive - this.smoothMouseActive) * lerpFactor;
      
      // Update uniforms
      this.gl.uniform2f(this.uniforms.uMouse, this.smoothMousePos.x, this.smoothMousePos.y);
      this.gl.uniform1f(this.uniforms.uMouseActiveFactor, this.smoothMouseActive);
      this.gl.uniform2f(this.uniforms.uFocal, this.options.focal[0], this.options.focal[1]);
      this.gl.uniform2f(this.uniforms.uRotation, this.options.rotation[0], this.options.rotation[1]);
      this.gl.uniform1f(this.uniforms.uStarSpeed, this.options.starSpeed);
      this.gl.uniform1f(this.uniforms.uDensity, this.options.density);
      this.gl.uniform1f(this.uniforms.uHueShift, this.options.hueShift);
      this.gl.uniform1f(this.uniforms.uSpeed, this.options.speed);
      this.gl.uniform1f(this.uniforms.uGlowIntensity, this.options.glowIntensity);
      this.gl.uniform1f(this.uniforms.uSaturation, this.options.saturation);
      this.gl.uniform1i(this.uniforms.uMouseRepulsion, this.options.mouseRepulsion ? 1 : 0);
      this.gl.uniform1f(this.uniforms.uTwinkleIntensity, this.options.twinkleIntensity);
      this.gl.uniform1f(this.uniforms.uRotationSpeed, this.options.rotationSpeed);
      this.gl.uniform1f(this.uniforms.uRepulsionStrength, this.options.repulsionStrength);
      this.gl.uniform1f(this.uniforms.uAutoCenterRepulsion, this.options.autoCenterRepulsion);
      this.gl.uniform1i(this.uniforms.uTransparent, this.options.transparent ? 1 : 0);
      
      // Render
      this.gl.useProgram(this.program);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
      
      const positionLocation = this.gl.getAttribLocation(this.program, 'position');
      const uvLocation = this.gl.getAttribLocation(this.program, 'uv');
      
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 16, 0);
      this.gl.enableVertexAttribArray(uvLocation);
      this.gl.vertexAttribPointer(uvLocation, 2, this.gl.FLOAT, false, 16, 8);
      
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    };
    
    this.animateId = requestAnimationFrame(animate);
  }
  
  setupCSSFallback() {
    console.log('Galaxy: Using CSS fallback');
    
    // Create simple starfield as fallback
    this.container.style.background = 'radial-gradient(ellipse at center, #000000 0%, #000000 50%, #000000 100%)';
    
    // Add some animated stars
    for (let i = 0; i < 40; i++) {
      const star = document.createElement('div');
      star.style.position = 'absolute';
      star.style.width = Math.random() * 2 + 'px';
      star.style.height = star.style.width;
      star.style.background = '#ffffff';
      star.style.borderRadius = '50%';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.opacity = Math.random() * 0.8 + 0.2;
      star.style.animation = `twinkle ${Math.random() * 3 + 1}s ease-in-out infinite alternate`;
      star.style.pointerEvents = 'none';
      star.style.zIndex = '1';
      star.style.boxShadow = '0 0 6px rgba(255, 255, 255, 0.8)';
      this.container.appendChild(star);
    }
    
    // Add CSS animation
    if (!document.getElementById('galaxy-styles')) {
      const style = document.createElement('style');
      style.id = 'galaxy-styles';
      style.textContent = `
        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  destroy() {
    if (this.animateId) {
      cancelAnimationFrame(this.animateId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    if (this.gl) {
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
}

// Initialize galaxy when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const profileCardRoot = document.getElementById('profile-card-root');
    if (profileCardRoot) {
      console.log('Profile card root found, creating galaxy...');
      
      // Create galaxy with WebGL
      const galaxy = new Galaxy(profileCardRoot, {
        focal: [0.5, 0.5],
        rotation: [1.0, 0.0],
        starSpeed: 0.5,
        density: 1,
        hueShift: 140,
        disableAnimation: false,
        speed: 1.0,
        mouseInteraction: true,
        glowIntensity: 0.3,
        saturation: 0.0,
        mouseRepulsion: true,
        repulsionStrength: 2,
        twinkleIntensity: 0.3,
        rotationSpeed: 0.1,
        autoCenterRepulsion: 0,
        transparent: true
      });
      
      console.log('Galaxy created successfully');
    } else {
      console.log('Profile card root not found');
    }
  }, 200);
});