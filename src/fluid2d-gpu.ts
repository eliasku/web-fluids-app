import {hue, Vec4} from "./vec4";
import {h, w} from "./fluid2d";

function createGLContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
    const params: WebGLContextAttributes = {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false
    };
    const gl = canvas.getContext("webgl2", params);
    if (gl) {
        const ext = gl.getExtension('EXT_color_buffer_float');
        if (ext) {
            const linearFiltering = gl.getExtension('OES_texture_float_linear');
            if (!linearFiltering) {
                console.warn("no linear filtering for float render targets");
            }
            return gl;
        }
    }
    return null;
}

type UniformMap = { [key: string]: WebGLUniformLocation | null };

function createShader(gl: WebGL2RenderingContext, type: GLenum, code: string) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: string, fragmentShader: string) {
    const program = gl.createProgram()!;
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShader)!;
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader)!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(gl.getProgramInfoLog(program));
    }
    return program;
}

function getUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): UniformMap {
    let uniforms: UniformMap = {};
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let uniformName = gl.getActiveUniform(program, i)?.name;
        if (uniformName) {
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
    }
    return uniforms;
}

const baseVertexShaderCode = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const splatShaderCode = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    float a = exp(-dot(p, p) / radius);
    //vec3 r = a * color.xyz + (1.0 - a) * texture2D(uTarget, vUv).xyz;
    vec3 dest = texture2D(uTarget, vUv).xyz;
    //vec3 r = a * color.xyz + (1.0 - a) * dest;
    vec3 r = a * color.xyz + dest;
    gl_FragColor = vec4(r, 1.0);
}
`;

const curlShaderCode = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

const vorticityShaderCode = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = min(max(velocity, -1000.0), 1000.0);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

const displayShaderCode = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform sampler2D uSunrays;
uniform sampler2D uDithering;
uniform sampler2D uObstacleC;
uniform float uShadingK;
uniform vec2 ditherScale;
uniform vec2 texelSize;
vec3 linearToGamma (vec3 color) {
    color = max(color, vec3(0));
    return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
}
void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    vec3 lc = texture2D(uTexture, vL).rgb;
    vec3 rc = texture2D(uTexture, vR).rgb;
    vec3 tc = texture2D(uTexture, vT).rgb;
    vec3 bc = texture2D(uTexture, vB).rgb;
    float dx = length(rc) - length(lc);
    float dy = length(tc) - length(bc);
    vec3 n = normalize(vec3(dx, dy, length(texelSize)));
    vec3 l = vec3(0.0, 0.0, 1.0);
    float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
    c *= mix(1.0, diffuse, uShadingK);
    //c = mix(c, vec3(diffuse, diffuse, diffuse), uShadingK);

#ifdef BLOOM
    vec3 bloom = texture2D(uBloom, vUv).rgb;
#endif
#ifdef SUNRAYS
    float sunrays = texture2D(uSunrays, vUv).r;
    c *= sunrays;
#ifdef BLOOM
    bloom *= sunrays;
#endif
#endif
#ifdef BLOOM
    float noise = texture2D(uDithering, vUv * ditherScale).r;
    noise = noise * 2.0 - 1.0;
    bloom += noise / 255.0;
    bloom = linearToGamma(bloom);
    c += bloom;
#endif
    float noise = texture2D(uDithering, vUv * ditherScale).r;
    noise = noise * 2.0 - 1.0;
    c += noise / 255.0;
    float a = max(c.r, max(c.g, c.b));
    float C = texture2D(uObstacleC, vUv).x;
    gl_FragColor = vec4(c, a) + vec4(C, C, C, 0.0);
}
`;

const clearShaderCode = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () {
    gl_FragColor = value * texture2D(uTexture, vUv);
}
`;

const divergenceShaderCode = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uObstacleC;
uniform sampler2D uObstacleN;
void main () {
    if(texture2D(uObstacleC, vUv).x >= 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }
    vec4 oN = texture2D(uObstacleN, vUv);
    L = mix(L, -C.x, oN.x);  // if(oT > 0.0) vT = -vC;
    R = mix(R, -C.x, oN.y);  // if(oB > 0.0) vB = -vC;
    T = mix(T, -C.y, oN.z);  // if(oR > 0.0) vR = -vC;
    B = mix(B, -C.y, oN.w);  // if(oL > 0.0) vL = -vC;
    float div = -0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

const pressureShaderCode = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform sampler2D uObstacleC;
uniform sampler2D uObstacleN;
void main () {
    if(texture2D(uObstacleC, vUv).x >= 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float C = texture2D(uPressure, vUv).x;
    vec4 oN = texture2D(uObstacleN, vUv);
    L = mix(L, C, oN.x);  // if(oT > 0.0) vT = -vC;
    R = mix(R, C, oN.y);  // if(oB > 0.0) vB = -vC;
    T = mix(T, C, oN.z);  // if(oR > 0.0) vR = -vC;
    B = mix(B, C, oN.w);  // if(oL > 0.0) vL = -vC;
    float div = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T + div) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

const gradientSubtractShaderCode = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform sampler2D uObstacleC;
uniform sampler2D uObstacleN;

void main () {
    if(texture2D(uObstacleC, vUv).x >= 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float C = texture2D(uPressure, vUv).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    vec4 oN = texture2D(uObstacleN, vUv);
    L = mix(L, C, oN.x);  // if(oT > 0.0) vT = -vC;
    R = mix(R, C, oN.y);  // if(oB > 0.0) vB = -vC;
    T = mix(T, C, oN.z);  // if(oR > 0.0) vR = -vC;
    B = mix(B, C, oN.w);  // if(oL > 0.0) vL = -vC;
    velocity.xy -= 0.5 * vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

const solveShaderCode = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform highp vec2 uC;
uniform sampler2D uSource;
uniform sampler2D uObstacleC;
uniform sampler2D uObstacleN;
void main () {
    if(texture2D(uObstacleC, vUv).x >= 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    vec4 x0 = texture2D(uSource, vUv);
    vec4 L = texture2D(uSource, vL);
    vec4 R = texture2D(uSource, vR);
    vec4 T = texture2D(uSource, vT);
    vec4 B = texture2D(uSource, vB);
    vec4 oN = texture2D(uObstacleN, vUv);
    L = mix(L, x0, oN.x);  // if(oT > 0.0) vT = -vC;
    R = mix(R, x0, oN.y);  // if(oB > 0.0) vB = -vC;
    T = mix(T, x0, oN.z);  // if(oR > 0.0) vR = -vC;
    B = mix(B, x0, oN.w);  // if(oL > 0.0) vL = -vC;
    
    vec4 x = (x0 + uC.x * (L + R + B + T)) * uC.y;
    gl_FragColor = vec4(x.xyz, 1.0);
}
`;

const advectionShaderCode = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uObstacleC;
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;
vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
void main () {
    if(texture2D(uObstacleC, vUv).x > 0.5) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
#ifdef MANUAL_FILTERING
    vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
    vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    vec4 result = texture2D(uSource, coord);
#endif
    float decay = 1.0 + dissipation * dt;
    gl_FragColor = result / decay;
}
`;

const obstaclesShaderCode = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform highp vec2 uC;
uniform sampler2D uObstacles;
void main () {
    gl_FragColor = vec4(
        texture2D(uObstacles, vL).x,
        texture2D(uObstacles, vR).x,
        texture2D(uObstacles, vT).x,
        texture2D(uObstacles, vB).x
    );
}
`;

class Program {
    uniforms: UniformMap;
    program: WebGLProgram;

    constructor(readonly gl: WebGL2RenderingContext,
                vertexShader: string,
                fragmentShader: string) {
        this.program = createProgram(gl, vertexShader, fragmentShader);
        this.uniforms = getUniforms(gl, this.program);
    }

    bind() {
        this.gl.useProgram(this.program);
    }
}

class Fbo {
    texture: WebGLTexture;
    fbo: WebGLFramebuffer;
    texelSizeX: number;
    texelSizeY: number;

    constructor(readonly gl: WebGL2RenderingContext,
                readonly width: number,
                readonly height: number,
                internalFormat: GLenum,
                format: GLenum,
                type: GLenum,
                param: GLint) {
        gl.activeTexture(gl.TEXTURE0);

        this.texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        let err = gl.getError();
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
        err = gl.getError();
        if (err !== gl.NO_ERROR) {
            console.error(gl);
        }
        this.fbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.texelSizeX = 1.0 / width;
        this.texelSizeY = 1.0 / height;
    }

    attach(id: GLint): GLint {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        return id;
    }
}

class DoubleFbo {
    fbo1: Fbo;
    fbo2: Fbo;
    texelSizeX: number;
    texelSizeY: number;

    constructor(readonly gl: WebGL2RenderingContext,
                readonly width: number,
                readonly height: number,
                internalFormat: GLenum,
                format: GLenum,
                type: GLenum,
                param: GLint) {
        this.fbo1 = new Fbo(gl, width, height, internalFormat, format, type, param);
        this.fbo2 = new Fbo(gl, width, height, internalFormat, format, type, param);

        this.texelSizeX = 1.0 / width;
        this.texelSizeY = 1.0 / height;
    }

    get read(): Fbo {
        return this.fbo1;
    }

    set read(value) {
        this.fbo1 = value;
    }

    get write(): Fbo {
        return this.fbo2;
    }

    set write(value) {
        this.fbo2 = value;
    }

    swap() {
        const temp = this.fbo1;
        this.fbo1 = this.fbo2;
        this.fbo2 = temp;
    }
}

interface Config {
    vorticity: number;
    pressure: number;
    pressureIterations: number;
    dissipationVelocity: number;
    dissipationDensity: number;
    viscosity: number;
    diffusion: number;
    shading: number;
}

interface TextureObject {
    texture: WebGLTexture;
    width: number;
    height: number;

    attach(id: number): number;
}

function createTextureDefer(gl: WebGL2RenderingContext, url: string): TextureObject {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

    let obj :TextureObject = {
        texture,
        width: 1,
        height: 1,
        attach(id: number) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };

    let image = new Image();
    image.onload = () => {
        obj.width = image.width;
        obj.height = image.height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    image.src = url;

    return obj;
}

export class Fluid2dGpu {
    canvas: HTMLCanvasElement;
    globalScale: number = 1.0;

    config: Config = {
        vorticity: 10.0,
        pressure: 0.8,
        pressureIterations: 20,
        dissipationVelocity: 0.2,
        dissipationDensity: 1.0,
        viscosity: 0.0,
        diffusion: 0.0,
        shading: 0.0
    };

    gl: WebGL2RenderingContext;

    splatProgram: Program;
    curlProgram: Program;
    vorticityProgram: Program;
    divergenceProgram: Program;
    advectionProgram: Program;
    displayProgram: Program;
    clearProgram: Program;
    pressureProgram: Program;
    gradientSubtractProgram: Program;
    solveProgram: Program;
    obstaclesProgram: Program;

    ditheringTexture: TextureObject;

    vbo: WebGLBuffer;
    ibo: WebGLBuffer;

    dye: DoubleFbo;
    velocity: DoubleFbo;
    pressure: DoubleFbo;
    curl: Fbo;
    divergence: Fbo;
    obstacleC: DoubleFbo;
    obstacleN: DoubleFbo;

    timeScale: number = 1.0;

    on_globalScale() {
        const dpr = window.devicePixelRatio;
        this.canvas.style.width = Math.round(this.canvas.width * this.globalScale / dpr) + "px";
        this.canvas.style.height = Math.round(this.canvas.height * this.globalScale / dpr) + "px";
    }

    spawnAmount = 50.0 * 6.0 * 10.0;
    spawnForce = 60.0 * w;
    readonly color = new Vec4(1.0, 1.0, 1.0, 1.0);
    colorTime = 0.0;
    colorSpeed = 0.2;
    mousePushed = false;
    mouseX = 0;
    mouseY = 0;
    startX = 0;
    startY = 0;

    constructor(id: string) {
        const mapWidth = 1024;
        const mapHeight = 1024;
        const simulationWidth = 128;
        const simulationHeight = 128;

        this.canvas = document.getElementById(id) as HTMLCanvasElement;
        this.canvas.width = mapWidth;
        this.canvas.height = mapHeight;
        this.on_globalScale();

        const gl = createGLContext(this.canvas)!;
        this.gl = gl;

        this.vbo = gl.createBuffer()!;
        this.ibo = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        this.splatProgram = new Program(this.gl, baseVertexShaderCode, splatShaderCode);
        this.curlProgram = new Program(this.gl, baseVertexShaderCode, curlShaderCode);
        this.vorticityProgram = new Program(this.gl, baseVertexShaderCode, vorticityShaderCode);
        this.divergenceProgram = new Program(this.gl, baseVertexShaderCode, divergenceShaderCode);
        this.advectionProgram = new Program(this.gl, baseVertexShaderCode, advectionShaderCode);
        this.displayProgram = new Program(this.gl, baseVertexShaderCode, displayShaderCode);
        this.clearProgram = new Program(this.gl, baseVertexShaderCode, clearShaderCode);
        this.pressureProgram = new Program(this.gl, baseVertexShaderCode, pressureShaderCode);
        this.gradientSubtractProgram = new Program(this.gl, baseVertexShaderCode, gradientSubtractShaderCode);
        this.solveProgram = new Program(this.gl, baseVertexShaderCode, solveShaderCode);
        this.obstaclesProgram = new Program(this.gl, baseVertexShaderCode, obstaclesShaderCode);

        this.dye = new DoubleFbo(gl, mapWidth, mapHeight, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.LINEAR);
        this.velocity = new DoubleFbo(gl, simulationWidth, simulationHeight, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.LINEAR);
        this.pressure = new DoubleFbo(gl, simulationWidth, simulationHeight, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);
        this.divergence = new Fbo(gl, simulationWidth, simulationHeight, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);
        this.curl = new Fbo(gl, simulationWidth, simulationHeight, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);
        this.obstacleC = new DoubleFbo(gl, simulationWidth, simulationHeight, gl.R8, gl.RED, gl.UNSIGNED_BYTE, gl.NEAREST);
        this.obstacleN = new DoubleFbo(gl, simulationWidth, simulationHeight, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST);

        this.ditheringTexture = createTextureDefer(gl, "LDR_LLL1_0.png");

        this.canvas.onmousedown = (e) => {
            const dpr = window.devicePixelRatio;
            this.mousePushed = true;
            const bb = this.canvas.getBoundingClientRect();
            this.mouseX = ((e.clientX - bb.x) * (dpr / this.globalScale)) | 0;
            this.mouseY = ((e.clientY - bb.y) * (dpr / this.globalScale)) | 0;
            this.startX = this.mouseX;
            this.startY = this.mouseY;
            this.colorTime = Math.random();
            hue(this.color, this.colorTime - Math.trunc(this.colorTime));
        };

        this.canvas.onmouseup = (e) => {
            this.mousePushed = false;
        };

        this.canvas.onmousemove = (e) => {
            const dpr = window.devicePixelRatio;
            const bb = this.canvas.getBoundingClientRect();
            this.mouseX = (e.clientX - bb.x) * (dpr / this.globalScale) | 0;
            this.mouseY = (e.clientY - bb.y) * (dpr / this.globalScale) | 0;
        };
    }

    updateBrush(dt: number) {
        this.colorTime += dt * this.colorSpeed;
        hue(this.color, this.colorTime - (this.colorTime | 0));
        let mx = this.mouseX | 0;
        let my = this.mouseY | 0;
        const width = this.canvas.width;
        const height = this.canvas.height;
        if (this.mousePushed && (mx !== this.startX || my !== this.startY)) {
            if (mx > 0 && mx < width - 1 && my > 0 && my < height - 1) {
                const fx = mx - this.startX;
                const fy = my - this.startY;
                const len = Math.sqrt(fx * fx + fy * fy);
                //const n = (len | 0) + 1;
                const n = 1;
                let x = this.startX;
                let y = this.startY;
                let dx = (mx - this.startX) / n;
                let dy = (my - this.startY) / n;
                for (let i = 0; i < n + 1; ++i) {
                    //if (this.fluid.blocked[ij] !== 0) continue;
                    // this.fluid.addSourceDensity(this.spawnAmount / n, x | 0, y | 0);
                    // this.fluid.addSourceVelocity(this.spawnForce / n, fx, fy, x | 0, y | 0);
                    this.splat(x / width,
                        1.0 - y / height,
                        fx, -fy, this.color);

                    x += dx;
                    y += dy;
                }
                this.startX = mx;
                this.startY = my;
            }
        }
    }

    project() {
        const gl = this.gl;

        this.divergenceProgram.bind();
        gl.uniform2f(this.divergenceProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform1i(this.divergenceProgram.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(this.divergenceProgram.uniforms.uObstacleC, this.obstacleC.read.attach(1));
        gl.uniform1i(this.divergenceProgram.uniforms.uObstacleN, this.obstacleN.read.attach(2));
        this.blit(this.divergence);

        this.clearProgram.bind();
        gl.uniform1i(this.clearProgram.uniforms.uTexture, this.pressure.read.attach(0));
        gl.uniform1f(this.clearProgram.uniforms.value, this.config.pressure);
        this.blit(this.pressure.write);
        this.pressure.swap();

        this.pressureProgram.bind();
        gl.uniform2f(this.pressureProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform1i(this.pressureProgram.uniforms.uDivergence, this.divergence.attach(0));
        gl.uniform1i(this.pressureProgram.uniforms.uObstacleC, this.obstacleC.read.attach(2));
        gl.uniform1i(this.pressureProgram.uniforms.uObstacleN, this.obstacleN.read.attach(3));
        for (let i = 0; i < this.config.pressureIterations; ++i) {
            gl.uniform1i(this.pressureProgram.uniforms.uPressure, this.pressure.read.attach(1));
            this.blit(this.pressure.write);
            this.pressure.swap();
        }

        this.gradientSubtractProgram.bind();
        gl.uniform2f(this.gradientSubtractProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform1i(this.gradientSubtractProgram.uniforms.uPressure, this.pressure.read.attach(0));
        gl.uniform1i(this.gradientSubtractProgram.uniforms.uVelocity, this.velocity.read.attach(1));
        gl.uniform1i(this.gradientSubtractProgram.uniforms.uObstacleC, this.obstacleC.read.attach(2));
        gl.uniform1i(this.gradientSubtractProgram.uniforms.uObstacleN, this.obstacleN.read.attach(3));
        this.blit(this.velocity.write);
        this.velocity.swap();
    }

    vorticity(dt: number) {
        if(this.config.vorticity <= 0.0) {
            return;
        }

        const gl = this.gl;

        this.curlProgram.bind();
        gl.uniform2f(this.curlProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform1i(this.curlProgram.uniforms.uVelocity, this.velocity.read.attach(0));
        this.blit(this.curl);

        this.vorticityProgram.bind();
        gl.uniform2f(this.vorticityProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform1i(this.vorticityProgram.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(this.vorticityProgram.uniforms.uCurl, this.curl.attach(1));
        gl.uniform1f(this.vorticityProgram.uniforms.curl, this.config.vorticity);
        gl.uniform1f(this.vorticityProgram.uniforms.dt, dt);
        this.blit(this.velocity.write);
        this.velocity.swap();
    }

    diffuse(diff: number, dt:number, iterations: number, target: DoubleFbo) {
        if(diff <= 0.0) {
            return;
        }
        const gl = this.gl;
        this.solveProgram.bind();
        const a = dt * diff;
        gl.uniform2f(this.solveProgram.uniforms.texelSize, target.texelSizeX, target.texelSizeY);
        gl.uniform2f(this.solveProgram.uniforms.uC, a, 1.0 / (1.0 + 4.0 * a));
        gl.uniform1i(this.solveProgram.uniforms.uObstacleC, this.obstacleC.read.attach(1));
        gl.uniform1i(this.solveProgram.uniforms.uObstacleN, this.obstacleN.read.attach(2));
        for (let i = 0; i < iterations; ++i) {
            gl.uniform1i(this.solveProgram.uniforms.uSource, target.read.attach(0));
            this.blit(target.write);
            target.swap();
        }
    }

    step(dt: number) {
        const gl = this.gl;
        gl.disable(gl.BLEND);

        this.createObstacleN();

        this.advectionProgram.bind();
        gl.uniform2f(this.advectionProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        let velocityId = this.velocity.read.attach(0);
        gl.uniform1i(this.advectionProgram.uniforms.uVelocity, velocityId);
        gl.uniform1i(this.advectionProgram.uniforms.uSource, velocityId);
        gl.uniform1i(this.advectionProgram.uniforms.uObstacleC, this.obstacleC.read.attach(2));
        gl.uniform1f(this.advectionProgram.uniforms.dt, dt);
        gl.uniform1f(this.advectionProgram.uniforms.dissipation, this.config.dissipationVelocity);
        this.blit(this.velocity.write);
        this.velocity.swap();

        this.advectionProgram.bind();
        gl.uniform2f(this.advectionProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform1i(this.advectionProgram.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(this.advectionProgram.uniforms.uSource, this.dye.read.attach(1));
        gl.uniform1i(this.advectionProgram.uniforms.uObstacleC, this.obstacleC.read.attach(2));
        gl.uniform1f(this.advectionProgram.uniforms.dt, dt);
        gl.uniform1f(this.advectionProgram.uniforms.dissipation, this.config.dissipationDensity);
        this.blit(this.dye.write);
        this.dye.swap();

        this.diffuse(this.config.viscosity, dt, 20, this.velocity);
        this.diffuse(this.config.diffusion, dt, 20, this.dye);

        this.vorticity(dt);

        this.project();
    }

    N = 0;
    update(dt: number) {
        dt *= this.timeScale;
        if(dt > 0.0) {
            this.updateBrush(dt);
            if(this.N++ < 10) {
                //this.splat(Math.random(), Math.random(), Math.random() * 100 - 50, Math.random() * 100 - 50, new Vec4(Math.random(), 0, Math.random(), 1));

                let x = Math.random();
                let y = Math.random();
                for(let i = 0; i < 10; ++i) {
                    this.splatObstacle(x + i * this.obstacleC.texelSizeX, y);
                }
            }
            this.step(dt);
        }

        this.render(null);
    }

    render(target: Fbo | null) {
        const gl = this.gl;
        const width = target === null ? gl.drawingBufferWidth : target.width;
        const height = target === null ? gl.drawingBufferHeight : target.height;
        this.displayProgram.bind();
        gl.uniform2f(this.displayProgram.uniforms.texelSize, this.dye.texelSizeX, this.dye.texelSizeY);
        gl.uniform1i(this.displayProgram.uniforms.uTexture, this.dye.read.attach(0));
        //gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
        gl.uniform1f(this.displayProgram.uniforms.uShadingK, this.config.shading);
        gl.uniform1i(this.displayProgram.uniforms.uDithering, this.ditheringTexture.attach(2));
        gl.uniform1i(this.displayProgram.uniforms.uObstacleC, this.obstacleC.read.attach(3));
        gl.uniform2f(this.displayProgram.uniforms.ditherScale, width / this.ditheringTexture.width, height / this.ditheringTexture.height);
        this.blit(target);
    }

    splat(u: number, v: number, dx: number, dy: number, color: Vec4) {
        const gl = this.gl;
        this.splatProgram.bind();
        gl.uniform1i(this.splatProgram.uniforms.uTarget, this.velocity.read.attach(0));
        gl.uniform1f(this.splatProgram.uniforms.aspectRatio, this.canvas.width / this.canvas.height);
        gl.uniform2f(this.splatProgram.uniforms.point, u, v);
        gl.uniform3f(this.splatProgram.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(this.splatProgram.uniforms.radius, 1 / this.canvas.width);
        this.blit(this.velocity.write);
        this.velocity.swap();

        gl.uniform1i(this.splatProgram.uniforms.uTarget, this.dye.read.attach(0));
        gl.uniform3f(this.splatProgram.uniforms.color, color.x, color.y, color.z);
        this.blit(this.dye.write);
        this.dye.swap();
    }

    splatObstacle(u: number, v: number) {
        const gl = this.gl;
        this.splatProgram.bind();
        gl.uniform1i(this.splatProgram.uniforms.uTarget, this.obstacleC.read.attach(0));
        gl.uniform1f(this.splatProgram.uniforms.aspectRatio, this.canvas.width / this.canvas.height);
        gl.uniform2f(this.splatProgram.uniforms.point, u, v);
        gl.uniform3f(this.splatProgram.uniforms.color, 1.0, 1.0, 1.0);
        gl.uniform1f(this.splatProgram.uniforms.radius, 1.0 / this.canvas.width);
        this.blit(this.obstacleC.write);
        this.obstacleC.swap();
    }

    blit(target: Fbo | null, clear?: undefined | boolean) {
        const gl = this.gl;
        if (target == null) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        if (clear) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    // create cell-neighbor scale factors
    private createObstacleN() {
        const gl = this.gl;
        this.obstaclesProgram.bind();
        gl.uniform2f(this.obstaclesProgram.uniforms.texelSize, this.obstacleC.texelSizeX, this.obstacleC.texelSizeY);
        gl.uniform1i(this.obstaclesProgram.uniforms.uObstacles, this.obstacleC.read.attach(0));
        this.blit(this.obstacleN.write);
        this.obstacleN.swap();
    }
}


