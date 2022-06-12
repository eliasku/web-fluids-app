const canvas = document.getElementById("view") as HTMLCanvasElement;
const dpr = window.devicePixelRatio;
const w = canvas.width;
const h = canvas.height;
const globalScale = 4.0;
canvas.style.width = Math.round(w * globalScale / dpr) + "px";
canvas.style.height = Math.round(h * globalScale / dpr) + "px";
const ctx = canvas.getContext("2d", {alpha: false});

let mousePushed = false;
let mouseX = 0;
let mouseY = 0;

canvas.onmousedown = (e) => {
    mousePushed = true;
    const bb = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - bb.x) * (dpr / globalScale)) | 0;
    mouseY = ((e.clientY - bb.y) * (dpr / globalScale)) | 0;
    startX = mouseX;
    startY = mouseY;
};

canvas.onmouseup = (e) => {
    mousePushed = false;
};

canvas.onmousemove = (e) => {
    const bb = canvas.getBoundingClientRect();
    mouseX = (e.clientX - bb.x) * (dpr / globalScale) | 0;
    mouseY = (e.clientY - bb.y) * (dpr / globalScale) | 0;
};

const PARTICLE_AMOUNT = 50.0;
const FORCE = 3.0;
// const VISCOSITY = 0.0001;
const VISCOSITY = 0.000001;
// const DIFFUSION = 0.0001;
const DIFFUSION = 0.000001;

let startX = 0.0;
let startY = 0.0;

function clamp(v: number, min: number, max: number) {
    return v <= max ? (v >= min ? v : min) : max;
}

class Fluid {
    fluidSize = w - 1;
    density = new Float32Array(w * h);
    xs = new Float32Array(w * h);
    ys = new Float32Array(w * h);
    densityPrev = new Float32Array(w * h);
    xsPrev = new Float32Array(w * h);
    ysPrev = new Float32Array(w * h);

    clearPrevious() {
        this.densityPrev.fill(0.0);
        this.xsPrev.fill(0.0);
        this.ysPrev.fill(0.0);
    }

    clearCurrent() {
        this.density.fill(0.0);
        this.xs.fill(0.0);
        this.ys.fill(0.0);
    }

    addSourceDensity(amount: number, x: number, y: number) {
        this.set(this.densityPrev, x | 0, y | 0, amount);
    }

    addSourceVelocity(force: number, dx: number, dy: number, x: number, y: number) {
        this.set(this.xsPrev, x | 0, y | 0, force * dx);
        this.set(this.ysPrev, x | 0, y | 0, force * dy);
    }

    addSource(dst: Float32Array, src: Float32Array, dt: number) {
        for (let i = 0; i < dst.length; ++i) {
            dst[i] += src[i] * dt;
        }
    }

    calcNeighbourSum(arr: Float32Array, x: number, y: number) {
        const i = y * w + x;
        return arr[i - w] + arr[i - 1] + arr[i + 1] + arr[i + w];
    }

    get(arr: Float32Array, x: number, y: number) {
        //if (x >= w || y < 0 || y >= h || x < 0) throw new Error("out of bounds");
        return arr[y * w + x];
    }

    set(arr: Float32Array, x: number, y: number, v: number) {
        //if (x >= w || y < 0 || y >= h || x < 0) throw new Error("out of bounds");
        arr[y * w + x] = v;
    }

    add(arr: Float32Array, x: number, y: number, v: number) {
        //if (x >= w || y < 0 || y >= h || x < 0) throw new Error("out of bounds");
        arr[y * w + x] += v;
    }

    setBounds(source: Float32Array, b: number) {
        const sizeX = w - 1;
        const sizeY = h - 1;
        const fx = b === 1 ? -1.0 : 1.0;
        for (let i = 1; i < sizeY; ++i) {
            this.set(source, 0, i, fx * this.get(source, 1, i));
            this.set(source, sizeX, i, fx * this.get(source, sizeX - 1, i));
        }
        const fy = b === 2 ? -1.0 : 1.0;
        for (let i = 1; i < sizeX; ++i) {
            source[i] = fy * source[w + i];
            this.set(source, i, sizeY, fy * this.get(source, i, sizeY - 1));
        }
        source[0] = 0.5 * (source[1] + source[w]);
        this.set(source, 0, sizeY, 0.5 * (this.get(source, 1, sizeY) + this.get(source, 0, sizeY - 1)));
        source[sizeX] = 0.5 * (source[sizeX - 1] + source[w + sizeX]);
        this.set(source, sizeX, sizeY, 0.5 * (this.get(source, sizeX - 1, sizeY) + this.get(source, sizeX, sizeY - 1)));
    }

    diffuse(cur: Float32Array, prev: Float32Array, diff: number, dt: number, iterations: number, b: number) {
        const sizeX = w - 1;
        const sizeY = h - 1;
        const ratio = dt * diff * (sizeX - 1) * (sizeY - 1);
        for (let k = 0; k < iterations; ++k) {
            for (let j = 1; j < sizeY; ++j) {
                for (let i = 1; i < sizeX; ++i) {
                    this.set(cur, i, j, (this.get(prev, i, j) + ratio * this.calcNeighbourSum(prev, i, j)) / (1 + 4 * ratio));
                }
            }
            this.setBounds(cur, b);
        }
    }

    advect(current: Float32Array, previous: Float32Array, velocityX: Float32Array, velocityY: Float32Array, dt: number, b: number) {
        const sizeX = w - 1;
        const sizeY = h - 1;
        const dtRatio = dt * (Math.min(sizeX, sizeY) - 1.0);
        for (let j = 1; j < sizeY; ++j) {
            for (let i = 1; i < sizeX; ++i) {
                const xPosition = clamp(i - dtRatio * this.get(velocityX, i, j), 0.5, sizeX - 0.5);
                const yPosition = clamp(j - dtRatio * this.get(velocityY, i, j), 0.5, sizeY - 0.5);
                const fromX = xPosition | 0;
                const fromY = yPosition | 0;
                const dtX = xPosition - fromX;
                const dtY = yPosition - fromY;
                const ptr = fromY * w + fromX;
                const m00 = previous[ptr];
                const m10 = previous[ptr + 1];
                const m01 = previous[ptr + w];
                const m11 = previous[ptr + w + 1];
                this.set(current, i, j, (1.0 - dtX) * ((1.0 - dtY) * m00 + dtY * m01) + dtX * ((1.0 - dtY) * m10 + dtY * m11));
            }
        }
        this.setBounds(current, b);
    }

    horizontalDifference(source: Float32Array, x: number, y: number) {
        const i = y * w + x;
        return -source[i - w] + source[i + w];
    }

    verticalDifference(source: Float32Array, x: number, y: number) {
        const i = y * w + x;
        return -source[i - 1] + source[i + 1];
    }

    project(currentX: Float32Array, currentY: Float32Array, previousX: Float32Array, previousY: Float32Array, iterations: number) {
        const sizeX = w - 1;
        const sizeY = h - 1;
        const unitSize = Math.min(sizeX, sizeY) - 1.0;
        const unit = 1.0 / unitSize;
        for (let j = 1; j < sizeY; ++j) {
            for (let i = 1; i < sizeX; ++i) {
                this.set(previousY, i, j, -0.5 * unit * (this.verticalDifference(currentX, i, j) + this.horizontalDifference(currentY, i, j)));
                this.set(previousX, i, j, 0.0);
            }
        }
        this.setBounds(previousY, 0);
        this.setBounds(previousX, 0);
        for (let k = 0; k < iterations; ++k) {
            for (let j = 1; j < sizeY; ++j) {
                for (let i = 1; i < sizeX; ++i) {
                    this.set(previousX, i, j, 0.25 * (this.get(previousY, i, j) + this.calcNeighbourSum(previousX, i, j)));
                }
            }
            this.setBounds(previousX, 0);
        }
        for (let j = 1; j < sizeY; ++j) {
            for (let i = 1; i < sizeX; ++i) {
                this.add(currentX, i, j, -0.5 * unitSize * this.verticalDifference(previousX, i, j));
                this.add(currentY, i, j, -0.5 * unitSize * this.horizontalDifference(previousX, i, j));
            }
        }
        this.setBounds(currentX, 1);
        this.setBounds(currentY, 2);
    }

    densityStep(diffusion: number, dt: number) {
        this.addSource(this.density, this.densityPrev, dt);
        this.diffuse(this.densityPrev, this.density, diffusion, dt, 20, 0);
        this.advect(this.density, this.densityPrev, this.xs, this.ys, dt, 0);
    }

    velocityStep(viscosity: number, dt: number) {
        this.addSource(this.xs, this.xsPrev, dt);
        this.addSource(this.ys, this.ysPrev, dt);
        this.diffuse(this.xsPrev, this.xs, viscosity, dt, 20, 1);
        this.diffuse(this.ysPrev, this.ys, viscosity, dt, 20, 2);
        this.project(this.xsPrev, this.ysPrev, this.xs, this.ys, 20);
        this.advect(this.xs, this.xsPrev, this.xsPrev, this.ysPrev, dt, 1);
        this.advect(this.ys, this.ysPrev, this.xsPrev, this.ysPrev, dt, 2);
        this.project(this.xs, this.ys, this.xsPrev, this.ysPrev, 20);
    }

}

const fluid = new Fluid();

const update = (dt: number) => {
    dt *= 0.1 / (1.0 / 60.0);
    fluid.clearPrevious();
    let mx = mouseX | 0;
    let my = mouseY | 0;
    if (mousePushed && (mx !== startX || my !== startY)) {
        if (mx > 0 && mx < w - 1 && my > 0 && my < h - 1) {
            if (mousePushed) {
                fluid.addSourceDensity(PARTICLE_AMOUNT, mx, my);
            }
            fluid.addSourceVelocity(FORCE, mx - startX, my - startY, mx, my);
            startX = mx;
            startY = my;
        }
    }

    fluid.velocityStep(VISCOSITY, dt);
    fluid.densityStep(DIFFUSION, dt);

    if (ctx) {
        const density = fluid.density;
        const image = ctx.getImageData(0, 0, w - 1, h - 1);
        let i_ptr = 0;
        let d_ptr = 0;
        for (let i = 0; i < h - 1; ++i) {
            for (let j = 0; j < w - 1; ++j) {
                const d = 0.25 * (density[d_ptr] +
                    density[d_ptr + 1] +
                    density[d_ptr + w] +
                    density[d_ptr + w + 1]);
                const p = (255.0 * d) | 0;
                image.data[i_ptr++] = p;
                image.data[i_ptr++] = p;
                image.data[i_ptr++] = p;
                image.data[i_ptr++] = 255;
                ++d_ptr;
            }
            ++d_ptr;
            //ptr += 4;
            //++d_ptr;
        }
        ctx.putImageData(image, 0, 0);
    }
};

let prevTime = 0;
const raf = (ts: DOMHighResTimeStamp) => {
    requestAnimationFrame(raf);

    update((ts - prevTime) / 1000.0);
    prevTime = ts;
};

fluid.clearCurrent();
raf(0);


