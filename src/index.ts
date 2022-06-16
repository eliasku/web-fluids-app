import {combo, group, Property, range} from "./props";
import {Simulation} from "./simulation";

const sim = new Simulation("view");
(window as any)["sim"] = sim;

document.body.appendChild(
    group("Sim",
        range(new Property(sim, "globalScale", 1.0, 8.0, 1)),
        group("Velocity",
            range(new Property(sim.fluid, "vorticity", 0.0, 50.0)),
            range(new Property(sim.fluid, "viscosity", 0.0, 0.01, 0.0001)),
        ),
        group("Diffusion",
            range(new Property(sim.fluid, "diffusionDensity", 0.0, 0.1, 0.001)),
            range(new Property(sim.fluid, "diffusionColor", 0.0, 0.1, 0.001)),
        ),
        group("Damping",
            range(new Property(sim.fluid, "dampDensity", 0.0, 10.0, 0.1)),
            range(new Property(sim.fluid, "dampVelocity", 0.0, 10.0, 0.1)),
        ),
        group("Gravity",
            range(new Property(sim.fluid, "gravityX", -1000, 1000)),
            range(new Property(sim.fluid, "gravityY", -1000, 1000)),
        ),
        group("Wind",
            range(new Property(sim.fluid, "cVelocityX", -100, 100)),
            range(new Property(sim.fluid, "cVelocityY", -100, 100)),
        ),
        combo(sim.fluid, "advectType", [
            "Linear",
            "MM",
            "BFECC"
        ]),
    ),
);

const update = (dt: number) => {
    sim.update(dt);
    sim.draw();
};

let prevTime = 0;
const raf = (ts: DOMHighResTimeStamp) => {
    requestAnimationFrame(raf);
    update((ts - prevTime) / 1000.0);
    prevTime = ts;
};

raf(0);
