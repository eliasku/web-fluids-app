import {Fluid2d, h, w} from "./fluid2d";
import {hue, Vec4} from "./vec4";

export class SimulationCanvasRenderer {
    ctx: CanvasRenderingContext2D;

    constructor(readonly canvas: HTMLCanvasElement) {
        this.ctx = this.canvas.getContext("2d", {alpha: false})!;
    }

    drawColors(fluid: Fluid2d) {
        if (this.ctx) {
            const image = this.ctx.getImageData(0, 0, w, h);
            this._drawColors(fluid, image.data);
            // this._drawVelocity(fluid, image.data);
            this.ctx.putImageData(image, 0, 0);
        }
    }

    _drawColors(fluid: Fluid2d, data: Uint8ClampedArray) {
        const dens = fluid.density;
        const blocked = fluid.blocked;
        const r0 = fluid.r0;
        const g0 = fluid.g0;
        const b0 = fluid.b0;
        let i_ptr = 0;
        let d_ptr = 0;
        for (let i = 0; i < h; ++i) {
            for (let j = 0; j < w; ++j) {
                let d = Math.min(1.0, 0.5 + dens[d_ptr]);
                if (blocked[d_ptr] !== 0) {
                    data[i_ptr++] = 255;
                    data[i_ptr++] = 255;
                    data[i_ptr++] = 255;
                    data[i_ptr++] = 255;
                } else {
                    data[i_ptr++] = d * 255 * r0[d_ptr];
                    data[i_ptr++] = d * 255 * g0[d_ptr];
                    data[i_ptr++] = d * 255 * b0[d_ptr];
                    data[i_ptr++] = 255;
                }
                ++d_ptr;
            }
            //++d_ptr;
        }
    }

    _drawVelocity(fluid: Fluid2d, data: Uint8ClampedArray) {
        const blocked = fluid.blocked;
        const u = fluid.u;
        const v = fluid.v;
        let i_ptr = 0;
        let d_ptr = 0;
        const color = new Vec4(0.0, 0.0, 0.0, 1.0);
        for (let i = 0; i < h; ++i) {
            for (let j = 0; j < w; ++j) {
                if (blocked[d_ptr] !== 0) {
                    data[i_ptr++] = 255;
                    data[i_ptr++] = 255;
                    data[i_ptr++] = 255;
                    data[i_ptr++] = 255;
                } else {
                    const vx = u[d_ptr];
                    const vy = v[d_ptr];
                    // Map [-Pi, Pi] to [0, 1]
                    const angle = 0.5 + (0.5 / Math.PI) * Math.atan2(vy, vx);
                    // velocity range [0, 255]
                    const unit = Math.sqrt(vx * vx + vy * vy) * 20.0;
                    hue(color, angle);
                    data[i_ptr++] = unit * color.x;
                    data[i_ptr++] = unit * color.y;
                    data[i_ptr++] = unit * color.z;
                    data[i_ptr++] = 255;
                }
                ++d_ptr;
            }
            //++d_ptr;
        }
    }
}

export class Simulation {
    canvas: HTMLCanvasElement;
    renderer: SimulationCanvasRenderer;

    fluid: Fluid2d;
    globalScale: number = 4.0;
    spawnAmount = 50.0 * 6.0 * 10.0;
    spawnForce = 60.0 * w;
    readonly color = new Vec4(1.0, 1.0, 1.0, 1.0);
    colorTime = 0.0;
    colorSpeed = 0.2;

    on_globalScale() {
        const dpr = window.devicePixelRatio;
        this.canvas.style.width = Math.round(w * this.globalScale / dpr) + "px";
        this.canvas.style.height = Math.round(h * this.globalScale / dpr) + "px";
    }

    constructor(id: string) {
        this.canvas = document.getElementById(id) as HTMLCanvasElement;
        this.canvas.width = w;
        this.canvas.height = h;
        this.on_globalScale();
        this.fluid = new Fluid2d();
        this.renderer = new SimulationCanvasRenderer(this.canvas);

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

        for (let i = 0; i < h; ++i) {
            this.fluid.blocked[i * w] = 1;
            this.fluid.blocked[i * w + w - 1] = 1;
        }
        for (let i = 0; i < w; ++i) {
            this.fluid.blocked[i] = 1;
            this.fluid.blocked[(h - 1) * w + i] = 1;
        }
        for (let i = 0; i < 20; ++i) {
            const x = ((w / 2 - 1)) | 0;
            const y = ((h / 2 - 1) + i) | 0;
            this.fluid.blocked[y * w + x] = 1;
        }
        for (let i = 0; i < 20; ++i) {
            const x = ((w / 2 - 1) - i) | 0;
            const y = ((h / 2 - 1)) | 0;
            this.fluid.blocked[y * w + x] = 1;
        }

        for (let i = 0; i < 70; ++i) {
            const x = i | 0;
            const y = ((h / 3 - 1)) | 0;
            this.fluid.blocked[y * w + x] = 1;
        }

        for (let i = 0; i < 70; ++i) {
            const x = i | 0;
            const y = ((h / 3 + 40)) | 0;
            this.fluid.blocked[y * w + x] = 1;
        }

        for (let i = 0; i < 70; ++i) {
            const x = 50 + i | 0;
            const y = ((h / 3 + 30)) | 0;
            this.fluid.blocked[y * w + x] = 1;
        }

        for (let i = 0; i < 70; ++i) {
            const x = 40 + i | 0;
            const y = ((h / 3 + 10 - 1)) | 0;
            this.fluid.blocked[y * w + x] = 1;
        }

        for (let i = 0; i < 20; ++i) {
            const x = ((w / 4 - 1)) | 0;
            const y = ((h / 4 - 1) - i) | 0;
            this.fluid.blocked[y * w + x] = 1;
        }
        for (let i = 0; i < 20; ++i) {
            const x = ((w / 4 - 1) + i) | 0;
            const y = ((h / 4 - 1)) | 0;
            this.fluid.blocked[y * w + x] = 1;
        }
    }

    mousePushed = false;
    mouseX = 0;
    mouseY = 0;
    startX = 0;
    startY = 0;

    update(dt: number) {
        this.colorTime += dt * this.colorSpeed;
        hue(this.color, this.colorTime - (this.colorTime|0));
        const r = this.color.x;
        const g = this.color.y;
        const b = this.color.z;

        this.fluid.clearPrevious();
        this.fluid.updateForces(dt);
        // this.fluid.addSourceDensity(500, w / 4, h / 4);
        // this.fluid.addSourceVelocity(FORCE, 5, 0, w / 4, h / 4);
        let mx = this.mouseX | 0;
        let my = this.mouseY | 0;
        if (this.mousePushed && (mx !== this.startX || my !== this.startY)) {
            if (mx > 0 && mx < w - 1 && my > 0 && my < h - 1) {
                const fx = mx - this.startX;
                const fy = my - this.startY;
                const len = Math.sqrt(fx * fx + fy * fy);
                const n = (len | 0) + 1;
                let x = this.startX;
                let y = this.startY;
                let dx = (mx - this.startX) / n;
                let dy = (my - this.startY) / n;
                for (let i = 0; i < n + 1; ++i) {
                    const ij = (y | 0) * w + (x | 0);
                    if (this.fluid.blocked[ij] !== 0) continue;
                    this.fluid.addSourceDensity(this.spawnAmount / n, x | 0, y | 0);
                    this.fluid.addSourceVelocity(this.spawnForce / n, fx, fy, x | 0, y | 0);

                    if (this.fluid.blocked[ij - 1] === 0) {
                        this.fluid.r0[ij - 1] = r;
                        this.fluid.g0[ij - 1] = g;
                        this.fluid.b0[ij - 1] = b;
                    }
                    if (this.fluid.blocked[ij - w] === 0) {
                        this.fluid.r0[ij - w] = r;
                        this.fluid.g0[ij - w] = g;
                        this.fluid.b0[ij - w] = b;
                    }
                    if (this.fluid.blocked[ij - w - 1] === 0) {
                        this.fluid.r0[ij - w - 1] = r;
                        this.fluid.g0[ij - w - 1] = g;
                        this.fluid.b0[ij - w - 1] = b;
                    }
                    this.fluid.r0[ij] = r;
                    this.fluid.g0[ij] = g;
                    this.fluid.b0[ij] = b;
                    if (this.fluid.blocked[ij + 1] === 0) {
                        this.fluid.r0[ij + 1] = r;
                        this.fluid.g0[ij + 1] = g;
                        this.fluid.b0[ij + 1] = b;
                    }
                    if (this.fluid.blocked[ij + w] === 0) {
                        this.fluid.r0[ij + w] = r;
                        this.fluid.g0[ij + w] = g;
                        this.fluid.b0[ij + w] = b;
                    }
                    if (this.fluid.blocked[ij + w + 1] === 0) {
                        this.fluid.r0[ij + w + 1] = r;
                        this.fluid.g0[ij + w + 1] = g;
                        this.fluid.b0[ij + w + 1] = b;
                    }
                    x += dx;
                    y += dy;
                }
                this.startX = mx;
                this.startY = my;
            }
        }

        this.fluid.velocityStep(dt);
        this.fluid.densityStep(dt);
    }

    draw() {
        this.renderer.drawColors(this.fluid);
    }
}