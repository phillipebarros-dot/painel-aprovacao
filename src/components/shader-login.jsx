// shader-login.jsx — WebGL RGB wave shader (three.js) escopado ao painel de login -> window.ShaderBg
function ShaderBg() {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const THREE = window.THREE;
    if (!THREE || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;

    const vertexShader = "attribute vec3 position; void main() { gl_Position = vec4(position, 1.0); }";
    const fragmentShader = [
      "precision highp float;",
      "uniform vec2 resolution; uniform float time; uniform float xScale; uniform float yScale; uniform float distortion;",
      "void main() {",
      "  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);",
      "  float d = length(p) * distortion;",
      "  float rx = p.x * (1.0 + d); float gx = p.x; float bx = p.x * (1.0 - d);",
      "  float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);",
      "  float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);",
      "  float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);",
      "  gl_FragColor = vec4(r, g, b, 1.0);",
      "}"
    ].join("\n");

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(new THREE.Color(0x000000));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1);
    const uniforms = {
      resolution: { value: [1, 1] }, time: { value: 0.0 },
      xScale: { value: 1.0 }, yScale: { value: 0.5 }, distortion: { value: 0.05 },
    };
    const position = [-1,-1,0, 1,-1,0, -1,1,0, 1,-1,0, -1,1,0, 1,1,0];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(position), 3));
    const material = new THREE.RawShaderMaterial({ vertexShader, fragmentShader, uniforms, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let raf = null;
    const resize = () => {
      const w = parent.clientWidth || 1, h = parent.clientHeight || 1;
      renderer.setSize(w, h, false);
      const p = renderer.getPixelRatio();
      uniforms.resolution.value = [w * p, h * p];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    window.addEventListener("resize", resize);

    const animate = () => {
      uniforms.time.value += 0.01;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);
  return <canvas ref={canvasRef} className="login-shader"/>;
}
window.ShaderBg = ShaderBg;
