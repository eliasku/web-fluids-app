(function(){'use strict';var __values = (undefined && undefined.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var Property = /** @class */ (function () {
    function Property(target, name, min, max, multiplier) {
        if (multiplier === void 0) { multiplier = 1.0; }
        this.target = target;
        this.name = name;
        this.min = min;
        this.max = max;
        this.multiplier = multiplier;
    }
    return Property;
}());
function range(prop) {
    var p = document.createElement("div");
    p.style.marginLeft = "10px";
    var label = document.createElement("label");
    var input = document.createElement("input");
    var output = document.createElement("output");
    label.htmlFor = prop.name;
    label.innerText = prop.name;
    if (prop.multiplier !== 1.0) {
        label.innerText += " (* " + prop.multiplier.toExponential() + ")";
    }
    p.appendChild(label);
    label.style.display = "inline-block";
    label.style.width = "200px";
    p.appendChild(input);
    input.style.display = "inline-block";
    input.style.verticalAlign = "middle";
    output.style.display = "inline-block";
    output.style.verticalAlign = "middle";
    p.appendChild(output);
    input.id = prop.name;
    input.type = "range";
    if (prop.min) {
        input.min = (prop.min / prop.multiplier).toString();
    }
    if (prop.max) {
        input.max = (prop.max / prop.multiplier).toString();
    }
    input.value = (prop.target[prop.name] / prop.multiplier).toString();
    output.innerText = prop.target[prop.name].toString();
    input.oninput = function (ev) {
        var val = input.value;
        var num = Number.parseFloat(val) * prop.multiplier;
        output.innerText = num.toString();
        if (prop.target) {
            prop.target[prop.name] = num;
            if (("on_" + prop.name) in prop.target) {
                prop.target["on_" + prop.name]();
            }
        }
    };
    return p;
}
function group(label) {
    var e_1, _a;
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var div = document.createElement("div");
    div.innerText = label;
    div.style.marginLeft = "10px";
    try {
        for (var args_1 = __values(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
            var el = args_1_1.value;
            if (el instanceof HTMLElement) {
                div.appendChild(el);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (args_1_1 && !args_1_1.done && (_a = args_1.return)) _a.call(args_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return div;
}function saturatef(x) {
    return x >= 0.0 ? (x <= 1.0 ? x : 1.0) : 0.0;
}
function hue(vec, h) {
    vec.x = saturatef(Math.abs(h * 6.0 - 3.0) - 1.0);
    vec.y = saturatef(2.0 - Math.abs(h * 6.0 - 2.0));
    vec.z = saturatef(2.0 - Math.abs(h * 6.0 - 4.0));
}
var Vec4 = /** @class */ (function () {
    function Vec4(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    return Vec4;
}());var Pointer = /** @class */ (function () {
    function Pointer() {
        this.id = 0;
        this.startX = +0.0;
        this.startY = +0.0;
        this.prevX = +0.0;
        this.prevY = +0.0;
        this.x = +0.0;
        this.y = +0.0;
        this.down = false;
        this.active = false;
    }
    return Pointer;
}());
var Input = /** @class */ (function () {
    function Input(canvas) {
        var _this = this;
        this.canvas = canvas;
        this.pointers = [];
        canvas.addEventListener("mousedown", function (e) {
            var scale = _this.canvas.width / _this.canvas.clientWidth;
            var bb = _this.canvas.getBoundingClientRect();
            _this.handleDown(_this.getPointer(-1), ((e.clientX - bb.x) * scale) | 0, ((e.clientY - bb.y) * scale) | 0);
        });
        canvas.addEventListener("mouseup", function (e) {
            _this.handleUp(_this.getPointer(-1));
        });
        canvas.addEventListener("mouseleave", function (e) {
            _this.handleUp(_this.getPointer(-1));
        });
        canvas.addEventListener("mouseenter", function (e) {
            if (e.buttons) {
                var scale = _this.canvas.width / _this.canvas.clientWidth;
                var bb = _this.canvas.getBoundingClientRect();
                _this.handleDown(_this.getPointer(-1), ((e.clientX - bb.x) * scale) | 0, ((e.clientY - bb.y) * scale) | 0);
            }
        });
        canvas.addEventListener("mousemove", function (e) {
            var scale = _this.canvas.width / _this.canvas.clientWidth;
            var bb = _this.canvas.getBoundingClientRect();
            _this.handleMove(_this.getPointer(-1), ((e.clientX - bb.x) * scale) | 0, ((e.clientY - bb.y) * scale) | 0);
        });
        canvas.addEventListener("touchstart", function (e) {
            e.preventDefault();
            var scale = _this.canvas.width / _this.canvas.clientWidth;
            var bb = _this.canvas.getBoundingClientRect();
            for (var i = 0; i < e.changedTouches.length; ++i) {
                var touch = e.changedTouches.item(i);
                _this.handleDown(_this.getPointer(touch.identifier), ((touch.clientX - bb.x) * scale) | 0, ((touch.clientY - bb.y) * scale) | 0);
            }
        });
        canvas.addEventListener("touchmove", function (e) {
            e.preventDefault();
            var scale = _this.canvas.width / _this.canvas.clientWidth;
            var bb = _this.canvas.getBoundingClientRect();
            for (var i = 0; i < e.changedTouches.length; ++i) {
                var touch = e.changedTouches.item(i);
                _this.handleMove(_this.getPointer(touch.identifier), ((touch.clientX - bb.x) * scale) | 0, ((touch.clientY - bb.y) * scale) | 0);
            }
        }, false);
        canvas.addEventListener("touchend", function (e) {
            for (var i = 0; i < e.changedTouches.length; ++i) {
                var touch = e.changedTouches.item(i);
                _this.handleUp(_this.getPointer(touch.identifier));
            }
        });
        canvas.addEventListener("touchcancel", function (e) {
            for (var i = 0; i < e.changedTouches.length; ++i) {
                var touch = e.changedTouches.item(i);
                _this.handleUp(_this.getPointer(touch.identifier));
            }
        });
    }
    Input.prototype.getPointer = function (id) {
        for (var i = 0; i < this.pointers.length; ++i) {
            if (this.pointers[i].id === id) {
                return this.pointers[i];
            }
        }
        var pointer = new Pointer();
        pointer.id = id;
        this.pointers.push(pointer);
        return pointer;
    };
    Input.prototype.handleDown = function (pointer, x, y) {
        pointer.x = x;
        pointer.y = y;
        pointer.prevX = x;
        pointer.prevY = y;
        pointer.startX = x;
        pointer.startY = y;
        pointer.down = true;
        pointer.active = true;
    };
    Input.prototype.handleMove = function (pointer, x, y) {
        pointer.prevX = pointer.x;
        pointer.prevY = pointer.y;
        pointer.x = x;
        pointer.y = y;
    };
    Input.prototype.handleUp = function (pointer) {
        pointer.down = false;
        pointer.active = false;
    };
    return Input;
}());function createGLContext(canvas) {
    var params = {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false
    };
    var gl = canvas.getContext("webgl2", params);
    if (gl) {
        var ext = gl.getExtension('EXT_color_buffer_float');
        if (ext) {
            var linearFiltering = gl.getExtension('OES_texture_float_linear');
            if (!linearFiltering) {
                console.warn("no linear filtering for float render targets");
            }
            return gl;
        }
    }
    return null;
}
function createShader(gl, type, code) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
    }
    return shader;
}
function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    var vs = createShader(gl, gl.VERTEX_SHADER, vertexShader);
    var fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn(gl.getProgramInfoLog(program));
    }
    return program;
}
function getUniforms(gl, program) {
    var _a;
    var uniforms = {};
    var uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < uniformCount; i++) {
        var uniformName = (_a = gl.getActiveUniform(program, i)) === null || _a === void 0 ? void 0 : _a.name;
        if (uniformName) {
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
    }
    return uniforms;
}
var baseVertexShaderCode = "\nprecision highp float;\nattribute vec2 aPosition;\nvarying vec2 vUv;\nvarying vec2 vL;\nvarying vec2 vR;\nvarying vec2 vT;\nvarying vec2 vB;\nuniform vec2 texelSize;\nvoid main () {\n    vUv = aPosition * 0.5 + 0.5;\n    vL = vUv - vec2(texelSize.x, 0.0);\n    vR = vUv + vec2(texelSize.x, 0.0);\n    vT = vUv + vec2(0.0, texelSize.y);\n    vB = vUv - vec2(0.0, texelSize.y);\n    gl_Position = vec4(aPosition, 0.0, 1.0);\n}\n";
var splatShaderCode = "\nprecision highp float;\nprecision highp sampler2D;\nvarying vec2 vUv;\nuniform sampler2D uTarget;\nuniform float aspectRatio;\nuniform vec3 color;\nuniform vec2 point;\nuniform float radius;\nvoid main () {\n    vec2 p = vUv - point.xy;\n    p.x *= aspectRatio;\n    float a = exp(-dot(p, p) / radius);\n    //vec3 r = a * color.xyz + (1.0 - a) * texture2D(uTarget, vUv).xyz;\n    vec3 dest = texture2D(uTarget, vUv).xyz;\n    //vec3 r = a * color.xyz + (1.0 - a) * dest;\n    vec3 r = a * color.xyz + dest;\n    gl_FragColor = vec4(r, 1.0);\n}\n";
var curlShaderCode = "\nprecision mediump float;\nprecision mediump sampler2D;\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\nuniform sampler2D uVelocity;\nvoid main () {\n    float L = texture2D(uVelocity, vL).y;\n    float R = texture2D(uVelocity, vR).y;\n    float T = texture2D(uVelocity, vT).x;\n    float B = texture2D(uVelocity, vB).x;\n    float vorticity = R - L - T + B;\n    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);\n}\n";
var vorticityShaderCode = "\nprecision highp float;\nprecision highp sampler2D;\nvarying vec2 vUv;\nvarying vec2 vL;\nvarying vec2 vR;\nvarying vec2 vT;\nvarying vec2 vB;\nuniform sampler2D uVelocity;\nuniform sampler2D uCurl;\nuniform float curl;\nuniform float dt;\nvoid main () {\n    float L = texture2D(uCurl, vL).x;\n    float R = texture2D(uCurl, vR).x;\n    float T = texture2D(uCurl, vT).x;\n    float B = texture2D(uCurl, vB).x;\n    float C = texture2D(uCurl, vUv).x;\n    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));\n    force /= length(force) + 0.0001;\n    force *= curl * C;\n    force.y *= -1.0;\n    vec2 velocity = texture2D(uVelocity, vUv).xy;\n    velocity += force * dt;\n    velocity = min(max(velocity, -1000.0), 1000.0);\n    gl_FragColor = vec4(velocity, 0.0, 1.0);\n}\n";
var displayShaderCode = "\nprecision highp float;\nprecision highp sampler2D;\nvarying vec2 vUv;\nvarying vec2 vL;\nvarying vec2 vR;\nvarying vec2 vT;\nvarying vec2 vB;\nuniform sampler2D uTexture;\nuniform sampler2D uBloom;\nuniform sampler2D uSunrays;\nuniform sampler2D uDithering;\nuniform sampler2D uObstacleC;\nuniform float uShadingK;\nuniform vec2 ditherScale;\nuniform vec2 texelSize;\nvec3 linearToGamma (vec3 color) {\n    color = max(color, vec3(0));\n    return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));\n}\nvoid main () {\n    vec3 c = texture2D(uTexture, vUv).rgb;\n    vec3 lc = texture2D(uTexture, vL).rgb;\n    vec3 rc = texture2D(uTexture, vR).rgb;\n    vec3 tc = texture2D(uTexture, vT).rgb;\n    vec3 bc = texture2D(uTexture, vB).rgb;\n    float dx = length(rc) - length(lc);\n    float dy = length(tc) - length(bc);\n    vec3 n = normalize(vec3(dx, dy, length(texelSize)));\n    vec3 l = vec3(0.0, 0.0, 1.0);\n    float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);\n    c *= mix(1.0, diffuse, uShadingK);\n    //c = mix(c, vec3(diffuse, diffuse, diffuse), uShadingK);\n\n#ifdef BLOOM\n    vec3 bloom = texture2D(uBloom, vUv).rgb;\n#endif\n#ifdef SUNRAYS\n    float sunrays = texture2D(uSunrays, vUv).r;\n    c *= sunrays;\n#ifdef BLOOM\n    bloom *= sunrays;\n#endif\n#endif\n#ifdef BLOOM\n    float noise = texture2D(uDithering, vUv * ditherScale).r;\n    noise = noise * 2.0 - 1.0;\n    bloom += noise / 255.0;\n    bloom = linearToGamma(bloom);\n    c += bloom;\n#endif\n    float noise = texture2D(uDithering, vUv * ditherScale).r;\n    noise = noise * 2.0 - 1.0;\n    c += noise / 255.0;\n    float a = max(c.r, max(c.g, c.b));\n    float C = texture2D(uObstacleC, vUv).x;\n    gl_FragColor = vec4(c, a) + vec4(C, C, C, 0.0);\n}\n";
var clearShaderCode = "\nprecision mediump float;\nprecision mediump sampler2D;\nvarying highp vec2 vUv;\nuniform sampler2D uTexture;\nuniform float value;\nvoid main () {\n    gl_FragColor = value * texture2D(uTexture, vUv);\n}\n";
var divergenceShaderCode = "\nprecision mediump float;\nprecision mediump sampler2D;\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\nuniform sampler2D uVelocity;\nuniform sampler2D uObstacleC;\nuniform sampler2D uObstacleN;\nvoid main () {\n    if(texture2D(uObstacleC, vUv).x >= 1.0) {\n        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n        return;\n    }\n    float L = texture2D(uVelocity, vL).x;\n    float R = texture2D(uVelocity, vR).x;\n    float T = texture2D(uVelocity, vT).y;\n    float B = texture2D(uVelocity, vB).y;\n    vec2 C = texture2D(uVelocity, vUv).xy;\n    if (vL.x < 0.0) { L = -C.x; }\n    if (vR.x > 1.0) { R = -C.x; }\n    if (vT.y > 1.0) { T = -C.y; }\n    if (vB.y < 0.0) { B = -C.y; }\n    vec4 oN = texture2D(uObstacleN, vUv);\n    L = mix(L, -C.x, oN.x);  // if(oT > 0.0) vT = -vC;\n    R = mix(R, -C.x, oN.y);  // if(oB > 0.0) vB = -vC;\n    T = mix(T, -C.y, oN.z);  // if(oR > 0.0) vR = -vC;\n    B = mix(B, -C.y, oN.w);  // if(oL > 0.0) vL = -vC;\n    float div = -0.5 * (R - L + T - B);\n    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);\n}\n";
var pressureShaderCode = "\nprecision mediump float;\nprecision mediump sampler2D;\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\nuniform sampler2D uPressure;\nuniform sampler2D uDivergence;\nuniform sampler2D uObstacleC;\nuniform sampler2D uObstacleN;\nvoid main () {\n    if(texture2D(uObstacleC, vUv).x >= 1.0) {\n        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n        return;\n    }\n    float L = texture2D(uPressure, vL).x;\n    float R = texture2D(uPressure, vR).x;\n    float T = texture2D(uPressure, vT).x;\n    float B = texture2D(uPressure, vB).x;\n    float C = texture2D(uPressure, vUv).x;\n    vec4 oN = texture2D(uObstacleN, vUv);\n    L = mix(L, C, oN.x);  // if(oT > 0.0) vT = -vC;\n    R = mix(R, C, oN.y);  // if(oB > 0.0) vB = -vC;\n    T = mix(T, C, oN.z);  // if(oR > 0.0) vR = -vC;\n    B = mix(B, C, oN.w);  // if(oL > 0.0) vL = -vC;\n    float div = texture2D(uDivergence, vUv).x;\n    float pressure = (L + R + B + T + div) * 0.25;\n    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);\n}\n";
var gradientSubtractShaderCode = "\nprecision mediump float;\nprecision mediump sampler2D;\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\nuniform sampler2D uPressure;\nuniform sampler2D uVelocity;\nuniform sampler2D uObstacleC;\nuniform sampler2D uObstacleN;\n\nvoid main () {\n    if(texture2D(uObstacleC, vUv).x >= 1.0) {\n        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n        return;\n    }\n    float L = texture2D(uPressure, vL).x;\n    float R = texture2D(uPressure, vR).x;\n    float T = texture2D(uPressure, vT).x;\n    float B = texture2D(uPressure, vB).x;\n    float C = texture2D(uPressure, vUv).x;\n    vec2 velocity = texture2D(uVelocity, vUv).xy;\n    vec4 oN = texture2D(uObstacleN, vUv);\n    L = mix(L, C, oN.x);  // if(oT > 0.0) vT = -vC;\n    R = mix(R, C, oN.y);  // if(oB > 0.0) vB = -vC;\n    T = mix(T, C, oN.z);  // if(oR > 0.0) vR = -vC;\n    B = mix(B, C, oN.w);  // if(oL > 0.0) vL = -vC;\n    velocity.xy -= 0.5 * vec2(R - L, T - B);\n    gl_FragColor = vec4(velocity, 0.0, 1.0);\n}\n";
var solveShaderCode = "\nprecision mediump float;\nprecision mediump sampler2D;\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\nuniform highp vec2 uC;\nuniform sampler2D uSource;\nuniform sampler2D uObstacleC;\nuniform sampler2D uObstacleN;\nvoid main () {\n    if(texture2D(uObstacleC, vUv).x >= 1.0) {\n        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n        return;\n    }\n    vec4 x0 = texture2D(uSource, vUv);\n    vec4 L = texture2D(uSource, vL);\n    vec4 R = texture2D(uSource, vR);\n    vec4 T = texture2D(uSource, vT);\n    vec4 B = texture2D(uSource, vB);\n    vec4 oN = texture2D(uObstacleN, vUv);\n    L = mix(L, x0, oN.x);  // if(oT > 0.0) vT = -vC;\n    R = mix(R, x0, oN.y);  // if(oB > 0.0) vB = -vC;\n    T = mix(T, x0, oN.z);  // if(oR > 0.0) vR = -vC;\n    B = mix(B, x0, oN.w);  // if(oL > 0.0) vL = -vC;\n    \n    vec4 x = (x0 + uC.x * (L + R + B + T)) * uC.y;\n    gl_FragColor = vec4(x.xyz, 1.0);\n}\n";
var advectionShaderCode = "\nprecision highp float;\nprecision highp sampler2D;\nvarying vec2 vUv;\nuniform sampler2D uVelocity;\nuniform sampler2D uSource;\nuniform sampler2D uObstacleC;\nuniform vec2 texelSize;\nuniform vec2 dyeTexelSize;\nuniform float dt;\nuniform float dissipation;\nvec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {\n    vec2 st = uv / tsize - 0.5;\n    vec2 iuv = floor(st);\n    vec2 fuv = fract(st);\n    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);\n    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);\n    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);\n    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);\n    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);\n}\nvoid main () {\n    if(texture2D(uObstacleC, vUv).x > 0.5) {\n        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n        return;\n    }\n#ifdef MANUAL_FILTERING\n    vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;\n    vec4 result = bilerp(uSource, coord, dyeTexelSize);\n#else\n    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;\n    vec4 result = texture2D(uSource, coord);\n#endif\n    float decay = 1.0 + dissipation * dt;\n    gl_FragColor = result / decay;\n}\n";
var obstaclesShaderCode = "\nprecision mediump float;\nprecision mediump sampler2D;\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\nuniform highp vec2 uC;\nuniform sampler2D uObstacles;\nvoid main () {\n    gl_FragColor = vec4(\n        texture2D(uObstacles, vL).x,\n        texture2D(uObstacles, vR).x,\n        texture2D(uObstacles, vT).x,\n        texture2D(uObstacles, vB).x\n    );\n}\n";
var Program = /** @class */ (function () {
    function Program(gl, vertexShader, fragmentShader) {
        this.gl = gl;
        this.program = createProgram(gl, vertexShader, fragmentShader);
        this.uniforms = getUniforms(gl, this.program);
    }
    Program.prototype.bind = function () {
        this.gl.useProgram(this.program);
    };
    return Program;
}());
var Fbo = /** @class */ (function () {
    function Fbo(gl, width, height, internalFormat, format, type, param) {
        this.gl = gl;
        this.width = width;
        this.height = height;
        gl.activeTexture(gl.TEXTURE0);
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var err = gl.getError();
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
        err = gl.getError();
        if (err !== gl.NO_ERROR) {
            console.error(gl);
        }
        this.fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.texelSizeX = 1.0 / width;
        this.texelSizeY = 1.0 / height;
    }
    Fbo.prototype.attach = function (id) {
        var gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        return id;
    };
    return Fbo;
}());
var DoubleFbo = /** @class */ (function () {
    function DoubleFbo(gl, width, height, internalFormat, format, type, param) {
        this.gl = gl;
        this.width = width;
        this.height = height;
        this.fbo1 = new Fbo(gl, width, height, internalFormat, format, type, param);
        this.fbo2 = new Fbo(gl, width, height, internalFormat, format, type, param);
        this.texelSizeX = 1.0 / width;
        this.texelSizeY = 1.0 / height;
    }
    Object.defineProperty(DoubleFbo.prototype, "read", {
        get: function () {
            return this.fbo1;
        },
        set: function (value) {
            this.fbo1 = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DoubleFbo.prototype, "write", {
        get: function () {
            return this.fbo2;
        },
        set: function (value) {
            this.fbo2 = value;
        },
        enumerable: false,
        configurable: true
    });
    DoubleFbo.prototype.swap = function () {
        var temp = this.fbo1;
        this.fbo1 = this.fbo2;
        this.fbo2 = temp;
    };
    return DoubleFbo;
}());
function createTextureDefer(gl, url) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));
    var obj = {
        texture: texture,
        width: 1,
        height: 1,
        attach: function (id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };
    var image = new Image();
    image.onload = function () {
        obj.width = image.width;
        obj.height = image.height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    image.src = url;
    return obj;
}
var Fluid2dGpu = /** @class */ (function () {
    function Fluid2dGpu(id) {
        this.globalScale = 1.0;
        this.config = {
            vorticity: 10.0,
            pressure: 0.8,
            pressureIterations: 20,
            dissipationVelocity: 0.2,
            dissipationDensity: 1.0,
            viscosity: 0.0,
            diffusion: 0.0,
            shading: 0.0
        };
        this.timeScale = 1.0;
        // spawnAmount = 50.0 * 6.0 * 10.0;
        // spawnForce = 60.0 * w;
        this.color = new Vec4(1.0, 1.0, 1.0, 1.0);
        this.colorTime = 0.0;
        this.colorSpeed = 0.2;
        this.N = 0;
        var mapWidth = 1024;
        var mapHeight = 1024;
        var simulationWidth = 128;
        var simulationHeight = 128;
        this.canvas = document.getElementById(id);
        this.canvas.width = mapWidth;
        this.canvas.height = mapHeight;
        this.on_globalScale();
        var gl = createGLContext(this.canvas);
        this.gl = gl;
        this.vbo = gl.createBuffer();
        this.ibo = gl.createBuffer();
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
        this.input = new Input(this.canvas);
    }
    Fluid2dGpu.prototype.on_globalScale = function () {
        var dpr = window.devicePixelRatio;
        this.canvas.style.width = Math.round(this.canvas.width * this.globalScale / dpr) + "px";
        this.canvas.style.height = Math.round(this.canvas.height * this.globalScale / dpr) + "px";
    };
    Fluid2dGpu.prototype.updateBrush = function (dt) {
        this.colorTime += dt * this.colorSpeed;
        hue(this.color, this.colorTime - (this.colorTime | 0));
        for (var i = 0; i < this.input.pointers.length; ++i) {
            var pointer = this.input.pointers[i];
            if (pointer.active && pointer.down) {
                var mx = pointer.x | 0;
                var my = pointer.y | 0;
                var width = this.canvas.width;
                var height = this.canvas.height;
                if (pointer.down && (mx !== pointer.prevX || my !== pointer.prevY)) {
                    if (mx > 0 && mx < width - 1 && my > 0 && my < height - 1) {
                        var fx = mx - pointer.prevX;
                        var fy = my - pointer.prevY;
                        //const n = (len | 0) + 1;
                        var n = 1;
                        var x = pointer.prevX;
                        var y = pointer.prevY;
                        var dx = (mx - pointer.prevX) / n;
                        var dy = (my - pointer.prevY) / n;
                        for (var i_1 = 0; i_1 < n + 1; ++i_1) {
                            //if (this.fluid.blocked[ij] !== 0) continue;
                            // this.fluid.addSourceDensity(this.spawnAmount / n, x | 0, y | 0);
                            // this.fluid.addSourceVelocity(this.spawnForce / n, fx, fy, x | 0, y | 0);
                            this.splat(x / width, 1.0 - y / height, fx, -fy, this.color);
                            x += dx;
                            y += dy;
                        }
                    }
                }
            }
        }
    };
    Fluid2dGpu.prototype.project = function () {
        var gl = this.gl;
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
        for (var i = 0; i < this.config.pressureIterations; ++i) {
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
    };
    Fluid2dGpu.prototype.vorticity = function (dt) {
        if (this.config.vorticity <= 0.0) {
            return;
        }
        var gl = this.gl;
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
    };
    Fluid2dGpu.prototype.diffuse = function (diff, dt, iterations, target) {
        if (diff <= 0.0) {
            return;
        }
        var gl = this.gl;
        this.solveProgram.bind();
        var a = dt * diff;
        gl.uniform2f(this.solveProgram.uniforms.texelSize, target.texelSizeX, target.texelSizeY);
        gl.uniform2f(this.solveProgram.uniforms.uC, a, 1.0 / (1.0 + 4.0 * a));
        gl.uniform1i(this.solveProgram.uniforms.uObstacleC, this.obstacleC.read.attach(1));
        gl.uniform1i(this.solveProgram.uniforms.uObstacleN, this.obstacleN.read.attach(2));
        for (var i = 0; i < iterations; ++i) {
            gl.uniform1i(this.solveProgram.uniforms.uSource, target.read.attach(0));
            this.blit(target.write);
            target.swap();
        }
    };
    Fluid2dGpu.prototype.step = function (dt) {
        var gl = this.gl;
        gl.disable(gl.BLEND);
        this.createObstacleN();
        this.advectionProgram.bind();
        gl.uniform2f(this.advectionProgram.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        var velocityId = this.velocity.read.attach(0);
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
    };
    Fluid2dGpu.prototype.update = function (dt) {
        dt *= this.timeScale;
        if (dt > 0.0) {
            this.updateBrush(dt);
            if (this.N++ < 10) {
                //this.splat(Math.random(), Math.random(), Math.random() * 100 - 50, Math.random() * 100 - 50, new Vec4(Math.random(), 0, Math.random(), 1));
                var x = Math.random();
                var y = Math.random();
                for (var i = 0; i < 10; ++i) {
                    this.splatObstacle(x + i * this.obstacleC.texelSizeX, y);
                }
            }
            this.step(dt);
        }
        this.render(null);
    };
    Fluid2dGpu.prototype.render = function (target) {
        var gl = this.gl;
        var width = target === null ? gl.drawingBufferWidth : target.width;
        var height = target === null ? gl.drawingBufferHeight : target.height;
        this.displayProgram.bind();
        gl.uniform2f(this.displayProgram.uniforms.texelSize, this.dye.texelSizeX, this.dye.texelSizeY);
        gl.uniform1i(this.displayProgram.uniforms.uTexture, this.dye.read.attach(0));
        //gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
        gl.uniform1f(this.displayProgram.uniforms.uShadingK, this.config.shading);
        gl.uniform1i(this.displayProgram.uniforms.uDithering, this.ditheringTexture.attach(2));
        gl.uniform1i(this.displayProgram.uniforms.uObstacleC, this.obstacleC.read.attach(3));
        gl.uniform2f(this.displayProgram.uniforms.ditherScale, width / this.ditheringTexture.width, height / this.ditheringTexture.height);
        this.blit(target);
    };
    Fluid2dGpu.prototype.splat = function (u, v, dx, dy, color) {
        var gl = this.gl;
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
    };
    Fluid2dGpu.prototype.splatObstacle = function (u, v) {
        var gl = this.gl;
        this.splatProgram.bind();
        gl.uniform1i(this.splatProgram.uniforms.uTarget, this.obstacleC.read.attach(0));
        gl.uniform1f(this.splatProgram.uniforms.aspectRatio, this.canvas.width / this.canvas.height);
        gl.uniform2f(this.splatProgram.uniforms.point, u, v);
        gl.uniform3f(this.splatProgram.uniforms.color, 1.0, 1.0, 1.0);
        gl.uniform1f(this.splatProgram.uniforms.radius, 1.0 / this.canvas.width);
        this.blit(this.obstacleC.write);
        this.obstacleC.swap();
    };
    Fluid2dGpu.prototype.blit = function (target, clear) {
        var gl = this.gl;
        if (target == null) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        else {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        if (clear) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
    // create cell-neighbor scale factors
    Fluid2dGpu.prototype.createObstacleN = function () {
        var gl = this.gl;
        this.obstaclesProgram.bind();
        gl.uniform2f(this.obstaclesProgram.uniforms.texelSize, this.obstacleC.texelSizeX, this.obstacleC.texelSizeY);
        gl.uniform1i(this.obstaclesProgram.uniforms.uObstacles, this.obstacleC.read.attach(0));
        this.blit(this.obstacleN.write);
        this.obstacleN.swap();
    };
    return Fluid2dGpu;
}());// const sim = new Simulation("view");
// document.body.appendChild(
//     group("Sim",
//         range(new Property(sim, "globalScale", 1.0, 8.0, 1)),
//         group("Velocity",
//             range(new Property(sim.fluid, "vorticity", 0.0, 50.0)),
//             range(new Property(sim.fluid, "viscosity", 0.0, 0.01, 0.0001)),
//         ),
//         group("Diffusion",
//             range(new Property(sim.fluid, "diffusionDensity", 0.0, 0.001, 0.000001)),
//             range(new Property(sim.fluid, "diffusionColor", 0.0, 0.001, 0.000001)),
//         ),
//         group("Damping",
//             range(new Property(sim.fluid, "dampDensity", 0.0, 10.0, 0.1)),
//             range(new Property(sim.fluid, "dampVelocity", 0.0, 10.0, 0.1)),
//         ),
//         group("Gravity",
//             range(new Property(sim.fluid, "gravityX", -1000, 1000)),
//             range(new Property(sim.fluid, "gravityY", -1000, 1000)),
//         ),
//         group("Wind",
//             range(new Property(sim.fluid, "cVelocityX", -100, 100)),
//             range(new Property(sim.fluid, "cVelocityY", -100, 100)),
//         ),
//         combo(sim.fluid, "advectType", [
//             "Linear",
//             "MM",
//             "BFECC"
//         ]),
//     ),
// );
var glSim = new Fluid2dGpu("glview");
document.body.appendChild(group("Sim", range(new Property(glSim, "globalScale", 1.0, 8.0, 1)), range(new Property(glSim, "timeScale", 0.0, 1.0, 0.1)), range(new Property(glSim.config, "shading", 0.0, 1.0, 0.1)), group("Velocity", range(new Property(glSim.config, "vorticity", 0.0, 50.0)), range(new Property(glSim.config, "viscosity", 0.0, 10, 0.1))), group("Diffusion", range(new Property(glSim.config, "diffusion", 0.0, 10, 0.1))), group("Pressure", range(new Property(glSim.config, "pressure", 0.0, 1.0, 0.01)), range(new Property(glSim.config, "pressureIterations", 4, 50.0))), group("Dissipation", range(new Property(glSim.config, "dissipationDensity", 0.0, 1.0, 0.01)), range(new Property(glSim.config, "dissipationVelocity", 0.0, 1.0, 0.01)))));
var update = function (dt) {
    // sim.update(dt);
    // sim.draw();
    glSim.update(dt);
};
var prevTime = 0;
var raf = function (ts) {
    requestAnimationFrame(raf);
    var dt = (ts - prevTime) / 1000.0;
    update(dt);
    prevTime = ts;
};
raf(0);})();//# sourceMappingURL=index.js.map
