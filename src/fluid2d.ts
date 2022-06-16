function clamp(v: number, min: number, max: number) {
    return v <= max ? (v >= min ? v : min) : max;
}

export const w = 128;
export const h = 128;

export class Fluid2d {

    vorticity = 10.0;
    viscosity = 0.000001;
    diffusionDensity = 0.000001;
    diffusionColor = 0.0;
    dampDensity = 0.1;
    dampVelocity = 0.0;
    gravityX = 0;
    gravityY = 900;
    cVelocityX = 0;
    cVelocityY = 0.1;

    density = new Float32Array(w * h);
    u = new Float32Array(w * h);
    v = new Float32Array(w * h);
    density0 = new Float32Array(w * h);
    u0 = new Float32Array(w * h);
    v0 = new Float32Array(w * h);
    scratch = new Float32Array(w * h);
    blocked = new Uint8Array(w * h);

    cu = new Float32Array(w * h);
    cv = new Float32Array(w * h);

    r = new Float32Array(w * h);
    g = new Float32Array(w * h);
    b = new Float32Array(w * h);
    r0 = new Float32Array(w * h);
    g0 = new Float32Array(w * h);
    b0 = new Float32Array(w * h);

    advectType = 2;

    constructor() {
        const dXSize = 1.0;
        const dYSize = 1.0;
        for (let j = 0; j < h; ++j) {
            for (let i = 0; i < w; ++i) {
                const ij = i + j * w;
                this.cu[ij] = i * dXSize;
                this.cv[ij] = j * dYSize;
            }
        }
    }

    clearPrevious() {
        this.density0.fill(0.0);
        this.u0.fill(0.0);
        this.v0.fill(0.0);
    }

    clearCurrent() {
        this.density.fill(0.0);
        this.u.fill(0.0);
        this.v.fill(0.0);
    }

    addSourceDensity(amount: number, x: number, y: number) {
        const ij = y * w + x;
        if (this.blocked[ij] === 0) {
            this.density0[ij] += amount;
        }
    }

    addSourceVelocity(force: number, dx: number, dy: number, x: number, y: number) {
        const ij = y * w + x;
        if (this.blocked[ij] === 0) {
            this.u0[ij] += force * dx;
            this.v0[ij] += force * dy;
        }
    }

    addSource(dst: Float32Array, src: Float32Array, dt: number) {
        for (let i = 0; i < dst.length; ++i) {
            dst[i] += src[i] * dt;
        }
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

    setBounds2(source: Float32Array, axis: number) {
        for (let j = 1; j < h - 1; ++j) {
            for (let i = 1; i < w - 1; ++i) {
                const ij = j * w + i;
                if (this.blocked[ij] === 0) {
                    continue;
                }
                let count = 0;
                let total = 0.0;
                if (axis === 1) {
                    if (this.blocked[ij - 1]) {
                        ++count;
                        total -= source[ij - 1];
                    }
                    if (this.blocked[ij + 1]) {
                        ++count;
                        total -= source[ij + 1];
                    }
                } else if (axis === 2) {
                    if (this.blocked[ij - w]) {
                        ++count;
                        total -= source[ij - w];
                    }
                    if (this.blocked[ij + w]) {
                        ++count;
                        total -= source[ij + w];
                    }
                } else {
                    if (this.blocked[ij - w]) {
                        ++count;
                        total += source[ij - w];
                    }
                    if (this.blocked[ij - 1]) {
                        ++count;
                        total += source[ij - 1];
                    }
                    if (this.blocked[ij + 1]) {
                        ++count;
                        total += source[ij + 1];
                    }
                    if (this.blocked[ij + w]) {
                        ++count;
                        total += source[ij + w];
                    }
                }
                if (count !== 0) {
                    total /= count;
                }
                source[ij] = total;
            }
        }

        const sizeX = w - 1;
        const sizeY = h - 1;
        const fx = axis === 1 ? -1.0 : 1.0;
        // const fx = b === 0 ? 0.0 : (b === 1 ? -1.0 : 1.0);
        for (let i = 1; i < sizeY; ++i) {
            this.set(source, 0, i, fx * this.get(source, 1, i));
            this.set(source, sizeX, i, fx * this.get(source, sizeX - 1, i));
        }
        const fy = axis === 2 ? -1.0 : 1.0;
        // const fy = b === 0 ? 0.0 : (b === 2 ? -1.0 : 1.0);
        for (let i = 1; i < sizeX; ++i) {
            source[i] = fy * source[w + i];
            this.set(source, i, sizeY, fy * this.get(source, i, sizeY - 1));
        }
        source[0] = 0.5 * (source[1] + source[w]);
        this.set(source, 0, sizeY, 0.5 * (this.get(source, 1, sizeY) + this.get(source, 0, sizeY - 1)));
        source[sizeX] = 0.5 * (source[sizeX - 1] + source[w + sizeX]);
        this.set(source, sizeX, sizeY, 0.5 * (this.get(source, sizeX - 1, sizeY) + this.get(source, sizeX, sizeY - 1)));

    }

    setBounds(source: Float32Array, axis: number) {
        for (let j = 1; j < h - 1; ++j) {
            for (let i = 1; i < w - 1; ++i) {
                const ij = j * w + i;
                if (this.blocked[ij]) {
                    source[ij] = 0.0;
                }
                if (axis === 1) {
                    if (this.blocked[ij - 1] && source[ij] < 0) {
                        source[ij] = -source[ij];
                    }
                    if (this.blocked[ij + 1] && source[ij] > 0) {
                        source[ij] = -source[ij];
                    }
                } else if (axis === 2) {
                    if (this.blocked[ij + w] && source[ij] > 0) {
                        source[ij] = -source[ij];
                    }
                    if (this.blocked[ij - w] && source[ij] < 0) {
                        source[ij] = -source[ij];
                    }
                } else {

                    // if (this.blocked[(j + 1) * w + i]) {
                    //     ++count;
                    //     total += source[(j + 1) * w + i];
                    // }
                    // if (this.blocked[(j - 1) * w + i]) {
                    //     ++count;
                    //     total += source[(j - 1) * w + i];
                    // }
                    // if (this.blocked[j * w + i - 1]) {
                    //     ++count;
                    //     total += source[j * w + i - 1];
                    // }
                    // if (this.blocked[j * w + i + 1]) {
                    //     ++count;
                    //     total += source[j * w + i + 1];
                    // }
                }
                // if (count !== 0) {
                //     total /= count;
                // }
                // source[j * w + i] = total;
            }
        }

        // const sizeX = w - 1;
        // const sizeY = h - 1;
        // const fx = axis === 1 ? -1.0 : 1.0;
        // // const fx = b === 0 ? 0.0 : (b === 1 ? -1.0 : 1.0);
        // for (let i = 1; i < sizeY; ++i) {
        //     this.set(source, 0, i, fx * this.get(source, 1, i));
        //     this.set(source, sizeX, i, fx * this.get(source, sizeX - 1, i));
        // }
        // const fy = axis === 2 ? -1.0 : 1.0;
        // // const fy = b === 0 ? 0.0 : (b === 2 ? -1.0 : 1.0);
        // for (let i = 1; i < sizeX; ++i) {
        //     source[i] = fy * source[w + i];
        //     this.set(source, i, sizeY, fy * this.get(source, i, sizeY - 1));
        // }
        // source[0] = 0.5 * (source[1] + source[w]);
        // this.set(source, 0, sizeY, 0.5 * (this.get(source, 1, sizeY) + this.get(source, 0, sizeY - 1)));
        // source[sizeX] = 0.5 * (source[sizeX - 1] + source[w + sizeX]);
        // this.set(source, sizeX, sizeY, 0.5 * (this.get(source, sizeX - 1, sizeY) + this.get(source, sizeX, sizeY - 1)));

    }

    solve(x: Float32Array, x0: Float32Array, a: number, c: number, iterations: number, axis: number) {
        const sizeX = w - 1;
        const sizeY = h - 1;
        for (let k = 0; k < iterations; ++k) {
            for (let j = 1; j < sizeY; ++j) {
                for (let i = 1; i < sizeX; ++i) {
                    const ij = j * w + i;
                    const neighbourSum = x[ij - w] + x[ij - 1] + x[ij + 1] + x[ij + w];
                    x[ij] = (x0[ij] + a * neighbourSum) / c;
                }
            }
            this.setBounds(x, axis);
        }
    }

    diffuse(x: Float32Array, x0: Float32Array, diff: number, dt: number, iterations: number, axis: number) {
        const sizeX = w - 1;
        const sizeY = h - 1;
        // float a = dt * diff * N * N;
        const a = dt * diff * (sizeX - 1) * (sizeY - 1);
        // lin_solve(N, b, x, x0, a, 1 + 4 * a);
        this.solve(x, x0, a, 1.0 + 4.0 * a, iterations, axis);
    }

    advect(current: Float32Array, previous: Float32Array, u: Float32Array, v: Float32Array, dt: number, b: number) {
        const sizeX = w - 1;
        const sizeY = h - 1;
        const dx = dt * this.cVelocityX;
        const dy = dt * this.cVelocityY;
        for (let j = 1; j < sizeY; ++j) {
            for (let i = 1; i < sizeX; ++i) {
                const ij = j * w + i;
                if (this.blocked[ij] !== 0) {
                    continue;
                }
                const oldX = clamp(i - dx + dt * u[ij], 0.5, sizeX - 0.5);
                const oldY = clamp(j - dy + dt * v[ij], 0.5, sizeY - 0.5);
                const fromX = oldX | 0;
                const fromY = oldY | 0;
                const iR = oldX - fromX;
                const iT = oldY - fromY;
                const ij0 = fromY * w + fromX;
                const iL = 1.0 - iR;
                const iB = 1.0 - iT;
                const m00 = previous[ij0];
                const m10 = previous[ij0 + 1];
                const m01 = previous[ij0 + w];
                const m11 = previous[ij0 + w + 1];
                current[ij] =
                    // iB * (iL * m00 + iR * m10) +
                    // iT * (iL * m01 + iR * m11);

                    iL * (iB * m00 + iT * m01) +
                    iR * (iB * m10 + iT * m11);
                // (1.0 - dtX) * ((1.0 - dtY) * m00 + dtY * m01) +
                // dtX * ((1.0 - dtY) * m10 + dtY * m11);
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

    project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array, iterations: number) {
        const sizeX = w - 1;
        const sizeY = h - 1;
        const unitSizeX = sizeX - 1.0;
        const unitSizeY = sizeY - 1.0;
        const unitSize = Math.sqrt(unitSizeX * unitSizeX + unitSizeY * unitSizeY);
        const unit = 1.0 / unitSize;
        const unitX = 1.0 / unitSizeX;
        const unitY = 1.0 / unitSizeY;
        for (let j = 1; j < sizeY; ++j) {
            for (let i = 1; i < sizeX; ++i) {
                const ij = j * w + i;
                div[ij] = -0.5 * (unit * this.verticalDifference(u, i, j) + unit * this.horizontalDifference(v, i, j));
                p[ij] = 0.0;
            }
        }
        this.setBounds(div, 0);
        this.setBounds(p, 0);

        //lin_solve ( N, 0, p, div, 1, 4 );
        this.solve(p, div, 1.0, 4.0, iterations, 0);

        for (let j = 1; j < sizeY; ++j) {
            for (let i = 1; i < sizeX; ++i) {
                const ij = j * w + i;
                u[ij] -= 0.5 * unitSize * this.verticalDifference(p, i, j);
                v[ij] -= 0.5 * unitSize * this.horizontalDifference(p, i, j);
            }
        }
        this.setBounds(u, 1);
        this.setBounds(v, 2);
    }

    densityStep(dt: number) {
        // add_source ( N, x, x0, dt );
        // SWAP ( x0, x ); diffuse ( N, 0, x, x0, diff, dt );
        // SWAP ( x0, x ); advect ( N, 0, x, x0, u, v, dt );
        this.addSource(this.density, this.density0, dt);
        // this.r.set(this.r0);
        // this.g.set(this.g0);
        // this.b.set(this.b0);
        // this.diffuse(this.r, this.r0, diffusion, dt, 20, 0);
        // this.diffuse(this.g, this.g0, diffusion, dt, 20, 0);
        // this.diffuse(this.b, this.b0, diffusion, dt, 20, 0);
        if (this.advectType === 0) {
            this.advect(this.density0, this.density, this.u, this.v, dt, 0);
            this.advect(this.r, this.r0, this.u, this.v, dt, 0);
            this.advect(this.g, this.g0, this.u, this.v, dt, 0);
            this.advect(this.b, this.b0, this.u, this.v, dt, 0);
        } else if (this.advectType === 1) {
            this.advectPrepared(this.density0, this.density, this.cu, this.cv, 0);
            this.advectPrepared(this.r, this.r0, this.cu, this.cv, 0);
            this.advectPrepared(this.g, this.g0, this.cu, this.cv, 0);
            this.advectPrepared(this.b, this.b0, this.cu, this.cv, 0);
        } else if (this.advectType === 2) {
            this.advectPrepared(this.density0, this.density, this.cu, this.cv, 0);
            this.advectPrepared(this.r, this.r0, this.cu, this.cv, 0);
            this.advectPrepared(this.g, this.g0, this.cu, this.cv, 0);
            this.advectPrepared(this.b, this.b0, this.cu, this.cv, 0);
        }
        this.diffuse(this.density, this.density0, this.diffusionDensity, dt, 20, 0);
        this.diffuse(this.r0, this.r, this.diffusionColor, dt, 20, 0);
        this.diffuse(this.g0, this.g, this.diffusionColor, dt, 20, 0);
        this.diffuse(this.b0, this.b, this.diffusionColor, dt, 20, 0);
    }


    curl(u: Float32Array, v: Float32Array, x: number, y: number): number {
        // return this.get(u, x, y + 1) - this.get(u, x, y - 1) +
        //     this.get(v, x - 1, y) - this.get(v, x + 1, y);
        const ij = y * w + x;
        const dv_dx = v[ij + 1] - v[ij - 1];
        const du_dy = u[ij + w] - u[ij - w];
        return 0.5 * (du_dy - dv_dx);
    }

    vorticityConfinement(u: Float32Array, v: Float32Array, u0: Float32Array, v0: Float32Array): void {
        const vort = this.scratch;

        vort.fill(0.0);
        for (let j = 1; j < h - 1; ++j) {
            for (let i = 1; i < w - 1; ++i) {
                vort[j * w + i] = Math.abs(this.curl(u0, v0, i, j));
            }
        }
        this.setBounds(vort, 0);

        for (let j = 1; j < h - 1; ++j) {
            for (let i = 1; i < w - 1; ++i) {
                const ij = j * w + i;
                let dw_dx = 0.5 * (vort[ij + 1] - vort[ij - 1]);
                let dw_dy = 0.5 * (vort[ij + w] - vort[ij - w]);

                const ilen = 1.0 / (Math.sqrt(dw_dx * dw_dx + dw_dy * dw_dy) + 0.000001);
                dw_dx *= ilen;
                dw_dy *= ilen;

                const f = this.curl(u0, v0, i, j);
                u[ij] = -f * dw_dy;
                v[ij] = f * dw_dx;
            }
        }

        this.setBounds(u, 1);
        this.setBounds(v, 2);
    }

    velocityStep(dt: number) {
        // add_source ( N, u, u0, dt );
        // add_source ( N, v, v0, dt );
        // SWAP ( u0, u );
        // diffuse ( N, 1, u, u0, visc, dt );
        // SWAP ( v0, v );
        // diffuse ( N, 2, v, v0, visc, dt );
        // project ( N, u, v, u0, v0 );
        // SWAP ( u0, u );
        // SWAP ( v0, v );
        // advect ( N, 2, v, v0, u0, v0, dt );
        // advect ( N, 1, u, u0, u0, v0, dt );
        // project ( N, u, v, u0, v0 );
        this.addSource(this.u, this.u0, dt);
        this.addSource(this.v, this.v0, dt);

        this.vorticityConfinement(this.u0, this.v0, this.u, this.v);
        this.addSource(this.u, this.u0, this.vorticity * dt);
        this.addSource(this.v, this.v0, this.vorticity * dt);

        this.diffuse(this.u0, this.u, this.viscosity, dt, 20, 1);
        this.diffuse(this.v0, this.v, this.viscosity, dt, 20, 2);
        this.project(this.u0, this.v0, this.u, this.v, 20);

        if (this.advectType === 0) {
            this.advect(this.u, this.u0, this.u0, this.v0, dt, 1);
            this.advect(this.v, this.v0, this.u0, this.v0, dt, 2);
        } else if (this.advectType === 1) {
            this.prepareMM(this.u0, this.v0, dt);
            this.advectPrepared(this.u, this.u0, this.cu, this.cv, 1);
            this.advectPrepared(this.v, this.v0, this.cu, this.cv, 2);
        } else if (this.advectType === 2) {
            this.prepareBFECC(this.u0, this.v0, dt);
            this.advectPrepared(this.u, this.u0, this.cu, this.cv, 1);
            this.advectPrepared(this.v, this.v0, this.cu, this.cv, 2);
        }
        this.project(this.u, this.v, this.u0, this.v0, 20);

        const dvf = Math.exp(-this.dampVelocity * dt);
        for (let ij = 0; ij < this.u.length; ++ij) {
            this.u[ij] *= dvf;
            this.v[ij] *= dvf;
        }
    }

    interpVelocity(x: number, y: number, u: Float32Array, v: Float32Array, out: Float32Array) {
        if (x < 0.5) {
            x = 0.5;
        }
        if (x > (w - 2 + 0.5)) {
            x = (h - 2 + 0.5);
        }
        const i_prev = x | 0;
        const i_next = i_prev + 1;
        if (y < 0.5) {
            y = 0.5;
        }
        if (y > (h - 2 + 0.5)) {
            y = (h - 2 + 0.5);
        }
        const j_prev = y | 0;
        const j_next = j_prev + 1;

        // Bi-linear interpolation
        // Finding position inside the grid rescaled from 0-1
        const s1 = x - i_prev;
        const s0 = 1.0 - s1;
        const t1 = y - j_prev;
        const t0 = 1.0 - t1;


        const i0j0 = i_prev + (j_prev * w);
        const i0j1 = i_prev + (j_next * w);
        const i1j0 = i_next + (j_prev * w);
        const i1j1 = i_next + (j_next * w);

        // Velocity X
        out[0] = s0 * (t0 * u[i0j0] + t1 * u[i0j1]) + s1 * (t0 * u[i1j0] + t1 * u[i1j1]);
        // Velocity Y
        out[1] = s0 * (t0 * v[i0j0] + t1 * v[i0j1]) + s1 * (t0 * v[i1j0] + t1 * v[i1j1]);
    }

    prepareBFECC(u: Float32Array, v: Float32Array, dt: number) {
        for (let j = 1; j < h - 1; ++j) {
            for (let i = 1; i < w - 1; ++i) {
                const ij = i + j * w;
                const x = i;//this.characteristicsX[ij];
                const y = j;//this.cv[ij];
                const x_forward = x - u[ij] * dt;
                const y_forward = y - v[ij] * dt;
                this.interpVelocity(x_forward, y_forward, u, v, this.scratch);
                const velx_forward = this.scratch[0];
                const vely_forward = this.scratch[1];
                const x_backward = x_forward + velx_forward * dt;
                const y_backward = y_forward + vely_forward * dt;

                const error_x = 0.5 * (x - x_backward);
                const error_y = 0.5 * (y - y_backward);

                const x_bfe = x + error_x;
                const y_bfe = y + error_y;

                this.interpVelocity(x_bfe, y_bfe, u, v, this.scratch);
                const velx_bfe = this.scratch[0];
                const vely_bfe = this.scratch[1];
                const x_bfecc = x_bfe - velx_bfe * dt;
                const y_bfecc = y_bfe - vely_bfe * dt;

                this.cu[ij] = x_bfecc;
                this.cv[ij] = y_bfecc;
            }
        }
    }

    prepareMM(u: Float32Array, v: Float32Array, dt: number) {
        for (let j = 1; j < h - 1; ++j) {
            for (let i = 1; i < w - 1; ++i) {
                const ij = i + j * w;
                const x = i;//this.characteristicsX[ij];
                const y = j;//this.cv[ij];
                const x_forward = x - u[ij] * dt;
                const y_forward = y - v[ij] * dt;
                this.interpVelocity(x_forward, y_forward, u, v, this.scratch);
                const velx_forward = this.scratch[0];
                const vely_forward = this.scratch[1];
                const x_backward = x_forward + velx_forward * dt;
                const y_backward = y_forward + vely_forward * dt;

                const error_x = 0.5 * (x - x_backward);
                const error_y = 0.5 * (y - y_backward);

                let x_mm = x_forward + error_x;
                let y_mm = y_forward + error_y;
                // if (x_mm < 0.5) {
                //     x_mm = 0.5;
                // }
                // if (x_mm > (w - 2 + 0.5)) {
                //     x_mm = w - 2 + 0.5;
                // }
                // if (y_mm < 0.5) {
                //     y_mm = 0.5;
                // }
                // if (y_mm > (h - 2 + 0.5)) {
                //     y_mm = h - 2 + 0.5;
                // }

                this.cu[ij] = x_mm;
                this.cv[ij] = y_mm;
            }
        }
    }

    advectPrepared(current: Float32Array, previous: Float32Array, dx: Float32Array, dy: Float32Array, axis: number) {
        for (let j = 1; j < h - 1; ++j) {
            for (let i = 1; i < w - 1; ++i) {
                const ij = i + j * w;
                let x = dx[ij];
                let y = dy[ij];
                if (x < 0.5) {
                    x = 0.5;
                }
                if (x > (w - 2 + 0.5)) {
                    x = (w - 2 + 0.5);
                }
                const i_prev = x | 0;
                const i_next = i_prev + 1;
                if (y < 0.5) {
                    y = 0.5;
                }
                if (y > (h - 2 + 0.5)) {
                    y = (h - 2 + 0.5);
                }
                const j_prev = y | 0;
                const j_next = j_prev + 1;

                // Bi-linear interpolation
                // Finding position inside the grid rescaled from 0-1
                const s1 = x - i_prev;
                const s0 = 1.0 - s1;
                const t1 = y - j_prev;
                const t0 = 1.0 - t1;

                const i0j0 = i_prev + (j_prev * w);
                const i0j1 = i_prev + (j_next * w);
                const i1j0 = i_next + (j_prev * w);
                const i1j1 = i_next + (j_next * w);

                current[ij] = s0 * (t0 * previous[i0j0] + t1 * previous[i0j1]) +
                    s1 * (t0 * previous[i1j0] + t1 * previous[i1j1]);
            }
        }
        this.setBounds(current, axis);
    }

    updateForces(dt: number) {
        const df = Math.exp(-this.dampDensity * dt);
        for (let j = 1; j < h - 1; ++j) {
            for (let i = 1; i < w - 1; ++i) {
                const ij = j * w + i;
                const p = this.density[ij] * df;
                this.u0[ij] += this.gravityX * dt * p;
                this.v0[ij] += this.gravityY * dt * p;
                this.density[ij] = p;
            }
        }
    }
}