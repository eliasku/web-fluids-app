import {combo, group, Property, range} from "./props";
import {Simulation} from "./simulation";
import {Fluid2dGpu} from "./fluid2d-gpu";

// const sim = new Simulation("view");
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
const glSim = new Fluid2dGpu("glview");
document.body.appendChild(
    group("Sim",
        range(new Property(glSim, "globalScale", 1.0, 8.0, 1)),
        range(new Property(glSim, "timeScale", 0.0, 1.0, 0.1)),
        range(new Property(glSim.config, "shading", 0.0, 1.0, 0.1)),
        group("Velocity",
            range(new Property(glSim.config, "vorticity", 0.0, 50.0)),
            range(new Property(glSim.config, "viscosity", 0.0, 10, 0.1)),
        ),
        group("Diffusion",
            range(new Property(glSim.config, "diffusion", 0.0, 10, 0.1)),
        ),
        group("Pressure",
            range(new Property(glSim.config, "pressure", 0.0, 1.0, 0.01)),
            range(new Property(glSim.config, "pressureIterations", 4, 50.0)),
        ),
        group("Dissipation",
            range(new Property(glSim.config, "dissipationDensity", 0.0, 1.0, 0.01)),
            range(new Property(glSim.config, "dissipationVelocity", 0.0, 1.0, 0.01)),
        ),
    ),
);

const update = (dt: number) => {
    // sim.update(dt);
    // sim.draw();

    glSim.update(dt);
};

let prevTime = 0;
const raf = (ts: DOMHighResTimeStamp) => {
    requestAnimationFrame(raf);
    const dt = (ts - prevTime) / 1000.0;
    update(dt);
    prevTime = ts;
};

raf(0);
